#!/bin/bash

# Auto-detect sandbox public URL
# This works for Novita/GenSpark sandbox environments

PORT=5000

# Try to detect the public URL
if [ -n "$SANDBOX_ID" ]; then
  # Sandbox environment detected
  export PUBLIC_URL="https://${PORT}-${SANDBOX_ID}.sandbox.novita.ai"
  echo "🌐 Detected sandbox environment"
  echo "   PUBLIC_URL set to: $PUBLIC_URL"
else
  # Try to get it from the environment
  if [ -z "$PUBLIC_URL" ]; then
    # Default to localhost for local development
    export PUBLIC_URL="http://localhost:${PORT}"
    echo "💻 Local development mode"
    echo "   PUBLIC_URL set to: $PUBLIC_URL"
    echo ""
    echo "⚠️  NOTE: If you're in a sandbox, set PUBLIC_URL manually:"
    echo "   export PUBLIC_URL=https://5000-YOUR-SANDBOX-ID.sandbox.novita.ai"
  fi
fi

# Start the server
npm start
