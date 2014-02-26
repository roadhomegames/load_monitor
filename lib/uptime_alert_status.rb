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
end
