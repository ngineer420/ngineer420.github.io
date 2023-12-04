require 'fileutils'

raise 'DIR_PATH must be set' unless ENV['DIR_PATH']

%w[cd cd/sudo ls ls/sudo pwd pwd/sudo].each do |cmd|
  FileUtils.mkdir_p("public/bin/#{cmd}/#{ENV['DIR_PATH']}")
  FileUtils.touch("public/bin/#{cmd}/#{ENV['DIR_PATH']}/index.turbo_frame.html")
end
