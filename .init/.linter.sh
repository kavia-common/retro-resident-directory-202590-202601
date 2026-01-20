#!/bin/bash
cd /home/kavia/workspace/code-generation/retro-resident-directory-202590-202601/resident_frontend_app
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

