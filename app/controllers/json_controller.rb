require 'uptime_metrics.rb'
require 'active_support/time'

class JsonController < ApplicationController

  # Global metrics singleton
  $real_metrics = UptimeMetrics.new($PROD_APP_PARAMS.update_interval, $PROD_APP_PARAMS.updates_to_retain, :threaded, :real)
  $test_metrics = UptimeMetrics.new($TEST_APP_PARAMS.update_interval, $TEST_APP_PARAMS.updates_to_retain, :threaded, :test)

  def is_test?(test)
    (!test.nil? && test == "true")
  end

  def metrics(test)
    return is_test?(test) ? $test_metrics : $real_metrics
  end

  def app_params
    metrics(params[:test]).ensure_worker_running

    # Return app initialization params.
    test = params[:test];

    # Return appropriate initialization parameters depending on whether or not to run a test.
    if (is_test?(test))
      render json: $TEST_APP_PARAMS
    else
      render json: $PROD_APP_PARAMS
    end
  end

  def stats
    mets = metrics(params[:test]);
    mets.ensure_worker_running

    json = mets.thread_safe_stats
    json = (json ? json.to_json_obj : nil)
    render json: json
  end

  def data_since
    mets = metrics(params[:test]);
    mets.ensure_worker_running

    check_time_str = params[:time]
    timestamp = check_time_str ? 
      check_time_str.to_i :             # When the time was passed as a JSON argument, use it
      (Time.now.utc - mets.num_metrics)     # Otherwise, respond with the last update (one update interval ago)
    check_time = Time.at(timestamp)

    # check_time = check_time_str ? 
    #   DateTime.strptime(check_time_str) :                     # When the time was passed as a JSON argument, use it
    #   (Time.now.utc - mets.update_interval_secs.seconds)  # Otherwise, respond with the last update (one update interval ago)
   
    data = mets.get_metrics_since(check_time)


    # To easily translate between times in Ruby and Javascript, I follow the advice to send timestamps instead of time strings
    # from here: http://www.dotnetguy.co.uk/post/2011/10/31/convert-dates-between-ruby-and-javascript/
    formatted = data.collect do |d|
      { one: d.avg_one, two: d.avg_two, time: d.timestamp }
    end

    logger.info("#{data.length} data points of #{mets.num_metrics}")
    render json: formatted
  end

  # Alert status is also included as a component in "stats"
  def alert_status
    mets = metrics(params[:test]);
    mets.ensure_worker_running

    stats = mets.thread_safe_stats
    render json: stats.alert_status
  end

end
