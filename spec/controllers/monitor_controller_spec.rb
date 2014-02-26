require 'spec_helper'

describe MonitorController do

  describe "GET 'viz'" do
    it "returns http success" do
      get 'viz'
      response.should be_success
    end
  end

end
