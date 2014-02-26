# Global preferences available for access in Ruby files throughout the application.

class AppInitializeParams
  attr_accessor :update_interval # Time between updates in seconds
  attr_accessor :updates_to_retain # Number of updates to retain in the graph tracking load over time

  def initialize(up_interval, retain_count)
    @update_interval = up_interval
    @updates_to_retain = retain_count
  end
end

# Global variables
$PROD_APP_PARAMS = AppInitializeParams.new(10, 60) # Update every 10 seconds, retain 60 updates for a total of 10 minutes
$TEST_APP_PARAMS = AppInitializeParams.new(2.5, 60) # When running in test mode, update more frequently so we don't have to sit there as long
