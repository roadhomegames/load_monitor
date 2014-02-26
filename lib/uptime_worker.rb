require 'uptime_alert_status.rb'

class UptimeWorker
  def initialize()
  end

  def perform_task

    while (true)
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
        json_ut = UptimeCapture.new(up_str, match[2], match[3])
        $metrics.add_with_stats(json_ut, match[4], match[5])
      end      

      sleep($metrics.metric_count)
    end
  end
end