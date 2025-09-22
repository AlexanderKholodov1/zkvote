# Voting Server

This is the server for the voting system. It allows secure configuration and administration of votes.

## Requirements
- Node.js version 14 or higher
- NPM version 6 or higher

## Installation

1. Extract the ZIP file into a folder
2. Open a terminal in the folder and run:
```bash
npm install
```

## Usage

The server includes three executable files:

1. `generate-voters.bat`: Generates unique IDs for voters
   - Run this file first
   - Enter the number of voters you need
   - The IDs will be saved in `voters.json`

2. `start-server.bat`: Starts the voting server
   - Upon starting, it will ask you:
     - If you want to block multiple votes from the same IP
     - The voting subject
     - The available options (comma-separated)
   - The server will start on port 3000

3. `stop-server.bat`: Stops the server and cleans up temporary data

## Configuration

By default, the server listens on `http://localhost:3000`. Clients on the local network will need your IP address to connect:

1. Open a terminal and run `ipconfig`
2. Find your local network IP address (example: 192.168.1.100)
3. Share the complete URL with voters: `http://192.168.1.100:3000`

## Security Notes
- Keep voter IDs secure
- Distribute IDs individually to each voter
- Do not share server files with voters
- Only share the client (separate ZIP) with voters