require 'uptime_capture.rb'
require 'uptime_worker.rb'
require 'uptime_alert_status.rb'
require 'uptime_stats.rb'

# Adapted from "MetricClient" class described at 
# http://blog.arkency.com/2013/06/implementing-worker-threads-in-rails/
# The goal was to have a single background worker thread without all the overhead
# of maintaining separate background processes that keep a job queue a-la the
# delayed_job gem
class UptimeMetrics
  attr_accessor :metric_count
  attr_accessor :update_interval_secs

  attr_accessor :stats

  def initialize(count, interval_secs)
    @metric_count = count
    @update_interval_secs = interval_secs

    # all_metrics stores UptimeCapture type objects
    # All operations on this array must be thread-safe
    @all_metrics = [];

    @worker_mutex = Mutex.new
    @stats = UptimeStats.new
  end

  def num_metrics
    return @all_metrics.length
  end

  def add(metric)
    @worker_mutex.synchronize do
      internal_add(metric)
    end
  end

  def add_with_stats(metric, five_min, fifteen_min)
    @worker_mutex.synchronize do
      internal_add(metric)
      Rails.logger.info("Added " + metric.to_s)
      internal_update_stats(metric, internal_two_min_avg(), five_min, fifteen_min)
      Rails.logger.info("Stats done")
    end
  end

  def alert?
    return (@stats && @stats.alert_status) ? @stats.alert_status.alert? : false
  end

  def clear?
    return (@stats && @stats.alert_status) ? @stats.alert_status.clear? : false
  end

  def cur_alert
    return (@stats && @stats.alert_status) ? @stats.alert_status : UptimeAlertStatus.new
  end

  # Update statistics and alert status
  def internal_update_stats(metric, two_min, five_min, fifteen_min)
    Rails.logger.info("beginning internal_update_stats")
    alert_status = cur_alert

    Rails.logger.info("blah 1")
    if (alert?) # Alert case
      Rails.logger.info("alert case")
      if (two_min < $ALERT_THRESHOLD)
        alert_status.name = ALERTS::CLEAR;
        alert_status.issue_time = metric.create_time
        Rails.logger.info("Cleared alert " + metric.create_time.to_s + " #{two_min}")
      end
    else # Clear case
      Rails.logger.info("clear case")
      if (two_min > $ALERT_THRESHOLD)
        alert_status.name = ALERTS::name
        alert_status.issue_time = metric.create_time
        Rails.logger.info("Started alert " + metric.create_time.to_s + " #{two_min}")
      end
    end

    Rails.logger.info("blah 3")
    Rails.logger.info(metric.avg_one)
    @stats.setup(metric, two_min, five_min, fifteen_min, alert_status)
  end

  def internal_add(metric)
      # Add the new metric
      @all_metrics.push(metric);

      # Shift off the front of the array until it is the correct size
      while (@all_metrics.length > metric_count) do
        @all_metrics.shift();
      end
  end

  def internal_two_min_avg
    # According to this wikipedia article http://en.wikipedia.org/wiki/Load_(computing), computing load is calculated as an exponential
    # weighted average http://en.wikipedia.org/wiki/Moving_average_(technical_analysis)#Exponential_moving_average.
    # Without the actual behind-the-scenes samples used to calculate this number or at least the ability to reverse engineer
    # the original samples from the uptime captures, we cannot actually calculate the 2-min average with a formulation that
    # mirrors uptime's calculates for 1, 5, and 15 min.

    # Because we can't properly do this, we make a poor approximation by taking the average for the past 2 minutes of samples.
    # This is a poor approximation of the behavior of the other numbers, but as long as we're clear to users in the documentation about what this
    # number means in relation to the other numbers, that's probably the best we can do without an enormous investment of effort.

    # The dumb way we do it is just to return an average of all 1-min samples for the past 2-mins
    avg = 0;
    nSamples = 120 / @update_interval_secs
    samples_used = 0

    @all_metrics.reverse.each_with_index do |item, i|
      Rails.logger.info(item.avg_one.to_s)
      if (i > nSamples)
        break
      end

      samples_used += 1
      avg += item.avg_one.to_f
    end

    return avg / @metric_count
  end

  def get_metrics_since(utc_time)
    res = []

    @worker_mutex.synchronize do
      # The back of the array is most recent, and the array is in order
      # Walk back to front until we hit a time before the input
      @all_metrics.each do |ut_cap|
        if (ut_cap.create_time >= utc_time)
          # This capture is new since the input time
          res.push(ut_cap)
        else
          break
        end
      end
    end

    return res
  end

  def ensure_worker_running
    return if worker_running?
    @worker_mutex.synchronize do
      return if worker_running?
      start_worker
    end
  end

  def worker_running?
    @worker_thread && @worker_thread.alive?
  end

  def start_worker
    Rails.logger.info("Starting worker")

    @worker_thread = Thread.new do
      worker = UptimeWorker.new
      worker.perform_task
    end
  end 
end
