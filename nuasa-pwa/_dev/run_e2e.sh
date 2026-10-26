#!/bin/bash
cd /home/claude/pjwork
node e2e_server.js > /tmp/rig.log 2>&1 &
SP=$!; sleep 1.2
python3 e2e_run.py
kill $SP 2>/dev/null; echo "--- rig log ---"; tail -5 /tmp/rig.log
