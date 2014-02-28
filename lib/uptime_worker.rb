require 'uptime_alert_status.rb'

class UptimeWorker
  attr_accessor :parent

  def initialize(parent)
    @parent = parent
  end

  def perform_task

    loop do
      ut = %x{"uptime"} # Capture stdout from running "uptime" on the command line

      # Parse the uptime results
      # See http://rubular.com/r/6aOYTeK34z
      format = /up\s+(.*?),\s+([0-9]+) users?,\s+load averages?: ([0-9]+\.[0-9][0-9]),?\s+([0-9]+\.[0-9][0-9]),?\s+([0-9]+\.[0-9][0-9])/
      match = format.match(ut)
      if (match.nil?)
        Rails.logger.info("Failed to match uptime results #{ut}")
      else
        # Strip out the extra spacing after "days,"
        up_str = match[1].sub(/days,\s+/, "days, ")

        cap = UptimeCapture.new(match[3])
        parent.add_with_stats(cap, up_str, match[2], match[4], match[5])
      end      

      if (parent.use_threads)
        sleep(parent.update_interval_secs)
      else
        break
      end
    end
  end
end