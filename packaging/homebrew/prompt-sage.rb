class SageMode < Formula
  desc "Prompt Sage token-efficient mode for coding assistants"
  homepage "https://example.com/prompt-sage"
  url "https://example.com/prompt-sage/v0.1.0/prompt-sage-macos-arm64.tar.gz"
  sha256 "REPLACE_WITH_SHA256"
  version "0.1.0"

  def install
    bin.install "prompt-sage"
  end

  test do
    assert_match "Usage", shell_output("#{bin}/prompt-sage")
  end
end

