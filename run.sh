#!/bin/bash

# Step 1: Run your Node.js script and redirect output to a temporary file
node server.js > temp_output.txt

# Step 2: Use curl to send the contents of the temporary file to the Discord webhook
curl --location 'https://discordapp.com/api/webhooks/1221996308223623208/4rcuqhe2jDYzqEOMcKsTi1V3XvN7BF4Noojq7ktFL9mAPFqhz5AZ0lmUEzEIb7feQSnW' \
     --header 'Content-Type: application/json' \
     --data-binary "@temp_output.txt"

# Step 3: Optionally, delete the temporary file
rm temp_output.txt