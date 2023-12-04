require 'fileutils'

raise 'FILE_PATH must be set' unless ENV['FILE_PATH']

%w[cat cat/sudo].each do |cmd|
  FileUtils.mkdir_p("public/bin/#{cmd}/#{ENV['FILE_PATH']}")
  FileUtils.touch("public/bin/#{cmd}/#{ENV['FILE_PATH']}/index.turbo_frame.html")
end
