require 'uptime_alert_status.rb'

class TestWorker
  attr_accessor :parent

  def initialize(parent)
    @parent = parent
    @update_count = 0
    @period = 25.0
    @amplitude = 0.5
    @random_variation = 0.05
  end

  def get_sample(i)
    # Just return a simple pattern that follows the sine function around a load of 1
    # with a small random variation
    sample = 1 + Math.sin((i / @period) * Math::PI * 2.0) * @amplitude

    # Jitter the sample by a random variation between [-@random_variation and +@random_variation]
    sample = sample + rand() * (@random_variation * 2) - @random_variation
    return sample.round(2) # return result rounded to 2 decimal places like in uptime results
  end

  def perform_task

    loop do
      sample = get_sample(@update_count)
      # Rails.logger.info("Sample #{@update_count}: #{sample}")
      @update_count += 1

      # Add the test sample
      cap = UptimeCapture.new(sample)
      parent.add_with_stats(cap, "Test", "-1", "-1", "-1")

      if (parent.use_threads)
        sleep(parent.update_interval_secs)
      else
        break
      end
    end
  end
end
