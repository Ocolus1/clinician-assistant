#!/bin/bash

# Test script for budget endpoints using cURL
# This helps diagnose if API endpoints are working properly

# Variables
CLIENT_ID=88  # Default to test client
PORT=5001     # Based on console logs, server is running on port 5001

echo "===== Testing Budget API Endpoints with cURL ====="
echo "Using client ID: $CLIENT_ID"
echo "Using port: $PORT"

# Test budget settings endpoint
echo -e "\n===== Testing Budget Settings Endpoint ====="
curl -s http://localhost:$PORT/api/clients/$CLIENT_ID/budget-settings | jq .

# Test all budget settings endpoint
echo -e "\n===== Testing All Budget Settings Endpoint ====="
curl -s "http://localhost:$PORT/api/clients/$CLIENT_ID/budget-settings?all=true" | jq .

# Test budget items endpoint
echo -e "\n===== Testing Budget Items Endpoint ====="
curl -s http://localhost:$PORT/api/clients/$CLIENT_ID/budget-items | jq .

# Test sessions endpoint
echo -e "\n===== Testing Sessions Endpoint ====="
curl -s http://localhost:$PORT/api/clients/$CLIENT_ID/sessions | jq .

echo -e "\n===== All Tests Complete ====="