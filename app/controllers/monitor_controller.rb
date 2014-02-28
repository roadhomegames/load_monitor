class MonitorController < ApplicationController

  # Use the default response (which is to render the page via viz.html.erb)
  def viz
  end

  # This route is used to show test data rather than real metrics
  def viz_test
  end
  
end
