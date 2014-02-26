class JsonController < ApplicationController

  # Helper class
  class UptimeCapture
    attr_accessor :uptime
    attr_accessor :users
    attr_accessor :avg_one, :avg_five, :avg_fifteen;
    attr_accessor :create_time # Creation time in UTC

    def initialize(ut, use_count, a1, a5, a15)
      @uptime = ut
      @users = use_count
      @avg_one = a1
      @avg_five = a5
      @avg_fifteen = a15
      @create_time = Time.now.utc
    end
  end

  def app_params
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
      jsonUt = UptimeCapture.new(up_str, match[2], match[3], match[4], match[5])
      render json: jsonUt
    end
  end

  def data_since
    render nothing: true
  end

  def alert_status
    render nothing: true
  end

end
