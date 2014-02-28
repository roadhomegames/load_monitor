module ALERTS
  ALERT = "Alert";
  CLEAR = "Clear"
end

class UptimeAlertStatus
  attr_accessor :name
  attr_accessor :issue_time

  def initialize()
    # Initialize to clear
    @name = ALERTS::CLEAR;
    @issue_time = Time.now.utc
  end

  def alert?
    return @name == ALERTS::ALERT
  end

  def clear?
    return @clear == ALERTS::CLEAR
  end

  def trigger_alert(time)
    @name = ALERTS::ALERT
    @issue_time = time
  end

  def trigger_clear(time)
    @name = ALERTS::CLEAR
    @issue_time = time
  end
end
