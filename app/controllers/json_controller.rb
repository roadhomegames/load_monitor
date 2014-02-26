require 'uptime_metrics.rb'

class JsonController < ApplicationController

  # Global metrics singleton
  $metrics = UptimeMetrics.new($PROD_APP_PARAMS.update_interval, $PROD_APP_PARAMS.updates_to_retain)

  def app_params
    $metrics.ensure_worker_running
    logger.info($metrics.num_metrics)

    # Return app initialization params.
    test = params[:test];

    # Return appropriate initialization parameters depending on whether or not to run a test.
    if (!test.nil? && test == "true")
      render json: $TEST_APP_PARAMS
    else
      render json: $PROD_APP_PARAMS
    end
  end

  def stats
    $metrics.ensure_worker_running

    ut = %x{"uptime"} # Capture stdout from running "uptime" on the command line

    # Parse the uptime results
    # See http://rubular.com/r/6aOYTeK34z
    format = /up\s+(.*?),\s+([0-9]+) users?,\s+load averages?: ([0-9]+\.[0-9][0-9]),?\s+([0-9]+\.[0-9][0-9]),?\s+([0-9]+\.[0-9][0-9])/
    match = format.match(ut)
    if (match.nil?)
      render nothing: true
    else
      # Strip out the extra spacing after "days,"
      up_str = match[1].sub(/days,\s+/, "days, ")

      # Render the results to JSON using an object
      jsonUt = UptimeCapture.new(up_str, match[2], match[3])
      render json: jsonUt
    end
  end

  def data_since
    $metrics.ensure_worker_running
    render nothing: true
  end

  def alert_status
    $metrics.ensure_worker_running

    render nothing: true
  end

end
