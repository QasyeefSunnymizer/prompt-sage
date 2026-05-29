class SageMode < Formula
  desc "Prompt Sage token-efficient mode for coding assistants"
  homepage "https://example.com/prompt-sage"
  url "https://example.com/prompt-sage/v0.2.1/prompt-sage-macos-x64"
  sha256 "REPLACE_WITH_SHA256"
  version "0.2.1"

  def install
    bin.install "prompt-sage-macos-x64" => "prompt-sage"
  end

  test do
    assert_match "Usage", shell_output("#{bin}/prompt-sage")
  end
end
