# Helper class
class UptimeCapture
  attr_accessor :avg_one, :avg_two
  attr_accessor :create_time # Creation time in UTC

  def initialize(a1)
    @avg_one = a1.to_f
    @create_time = Time.now.utc
  end

  # Return the create_time as a timestamp
  def timestamp
    return @create_time.to_i
  end

  def to_s
    return "#{avg_one} load, #{avg_two}, #{create_time}"
  end
end
