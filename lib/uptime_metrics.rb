require 'uptime_capture.rb'
require 'uptime_worker.rb'
require 'test_worker.rb'
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
  attr_accessor :use_threads
  attr_accessor :test

  # This is true for sampling at canonical rate of 6 times per minute. Not true for other testing
  # rates, but we keep it there anyway to make testing faster
  @@SAMPLES_IN_TWO_MIN = 12; 

  def initialize(interval_secs, count, threaded, test)
    @metric_count = count
    @update_interval_secs = interval_secs
    @use_threads = (threaded == :threaded)
    @test = (test == :test)

    # all_metrics stores UptimeCapture type objects
    # All operations on this array must be thread-safe
    @all_metrics = [];

    # The two-minute exponential moving average (see comments for internal_update_two_min_avg)
    @two_min_ema = 0.5 # Initialize exponential moving average to 0.5 (arbitrary number, halfway to alert-level load)
    @worker_mutex = Mutex.new
    @stats = UptimeStats.new
  end

  def num_metrics
    return @all_metrics.length
  end

  def add(metric)
    do_lock do
      internal_add(metric)
    end
  end

  def add_with_stats(metric, up, users, five_min, fifteen_min)
    do_lock do
      internal_add(metric)

      two_min = internal_update_two_min_avg(metric.avg_one)
      metric.avg_two = two_min
      internal_update_stats(metric, up, users, two_min, five_min, fifteen_min)
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

  def do_lock
    if (@use_threads)
      @worker_mutex.synchronize do
        yield if block_given?
      end  
    else
      yield if block_given?
    end
  end

  def thread_safe_stats
    stats_copy = []

    # stats is modified by another thread, so lock and grab a copy to make thread-safe
    do_lock do
      stats_copy = @stats.clone
    end

    return stats_copy
  end

  def thread_safe_metrics
    metrics_copy = []

    do_lock do
      metrics_copy = @all_metrics.clone
    end

    return metrics_copy
  end

  # Update statistics and alert status
  def internal_update_stats(metric, up, users, two_min, five_min, fifteen_min)
    alert_status = cur_alert

    if (alert?) # Alert case
      if (two_min < $ALERT_THRESHOLD)
        alert_status.trigger_clear(metric.create_time)
        Rails.logger.info("Cleared alert #{metric.create_time} #{two_min}")
      end
    else # Clear case
      if (two_min > $ALERT_THRESHOLD)
        alert_status.trigger_alert(metric.create_time)
        Rails.logger.info("Started alert #{metric.create_time} #{two_min}")
      end
    end

    @stats.setup(metric, up, users, two_min, five_min, fifteen_min, alert_status)
  end

  def internal_add(metric)
      # Add the new metric
      @all_metrics.push(metric);

      # Shift off the front of the array until it is the correct size
      while (@all_metrics.length > metric_count) do
        @all_metrics.shift();
      end
  end

  def internal_update_two_min_avg(next_sample)
    # According to this wikipedia article http://en.wikipedia.org/wiki/Load_(computing), computing load is calculated as an exponential
    # weighted average http://en.wikipedia.org/wiki/Moving_average_(technical_analysis)#Exponential_moving_average.
    # Without the actual behind-the-scenes samples used to calculate this number or at least the ability to reverse engineer
    # the original samples from the uptime captures, we cannot actually calculate the 2-min average with a formulation that
    # mirrors uptime's calculates for 1, 5, and 15 min.

    # We instead make a poor-man's approximation by calculating our own non-weighted (or all weights=1) exponentail
    # moving average of the past two-minutes of 1-min avg samples. Keeping an exponential moving average instead of
    # a simple average will provide an approximation of uptime's behavior which also weights more recent samples more heavily
    # than older samples. The hope is that this provides both a more consistent and responsive user experience than a simple
    # average would.

    # Calculation for EMA explained here: http://www.iexplain.org/ema-how-to-calculate/
    # EMA_cur = next_sample * k + EMA_old * (1 – k)
    # where k = 2 / (n_sample - 1)
    n_samples = @@SAMPLES_IN_TWO_MIN
    k = 2.0 / (n_samples - 1)
    @two_min_ema = (next_sample * k) + (@two_min_ema * (1 - k))

    return @two_min_ema.round(2) # Round to 2 decimal places to remain consistent with uptime's results
  end

  def get_metrics_since(utc_time)
    res = []

    # There has got to be a more elegant way to do this in Ruby, just out of time to figure out how.
    # Apologies for the hack job in this funcdtion.
    do_lock do
      # The back of the array is most recent, and the array is in order
      # Walk back to front until we hit a time before the input
      @all_metrics.reverse.each do |ut_cap|
        if (ut_cap.create_time >= utc_time)
          # This capture is new since the input time
          res.push(ut_cap)
        else
          break
        end
      end
    end

    # Reverse in-place on return because clients expect data ordered with oldest at the start (increasing recency)
    return res.reverse!
  end

  def ensure_worker_running
    return if worker_running?
    do_lock do
      return if worker_running?
      start_worker
    end
  end

  def worker_running?
    @worker_thread && @worker_thread.alive?
  end

  def new_worker
    return (test ? TestWorker.new(self) : UptimeWorker.new(self))
  end

  def start_worker
    if (@use_threads)
      @worker_thread = Thread.new do
        Rails.logger.info("Starting threaded worker test = #{test}")
        worker = new_worker
        worker.perform_task
      end
    else
        worker = new_worker
        worker.perform_task
    end
  end 
end
