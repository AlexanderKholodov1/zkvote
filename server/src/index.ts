import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { voteService } from './services/voteService';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Load valid IDs from voters.json
const votersPath = path.join(__dirname, '../voters.json');

let validVoters: Set<string> = new Set();
let voted: Set<string> = new Set();

// Voting configuration
let votingSubject: string = '';
let votingOptions: string[] = [];
let blockMultipleIPVotes: boolean = false;
let votedIPs: Set<string> = new Set();

function askVotingConfig(): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    rl.question('Block multiple votes from the same IP? (y/n): ', (blockIP) => {
      blockMultipleIPVotes = blockIP.toLowerCase() === 'y';
      
      rl.question('Voting subject: ', (subject) => {
        if (!subject.trim()) {
          console.log('The subject cannot be empty. Aborting.');
          process.exit(1);
        }
        
        rl.question('Answer options (comma-separated): ', (opts) => {
          const options = opts.split(',').map(o => o.trim()).filter(o => o.length > 0);
          if (options.length < 2) {
            console.log('You must enter at least two options. Aborting.');
            process.exit(1);
          }
          
          votingSubject = subject.trim();
          votingOptions = options;
          
          console.log('\nVoting configured:')
          console.log(`IP blocking: ${blockMultipleIPVotes ? 'Enabled' : 'Disabled'}`);
          console.log('Subject:', votingSubject);
          options.forEach((opt, idx) => console.log(`[${idx}] ${opt}`));
          
          rl.close();
          resolve();
        });
      });
    });
  });
}

function loadVoters(): Promise<string[]> {
  return new Promise((resolve) => {
    if (!fs.existsSync(votersPath)) {
      console.log('ERROR: voters.json does not exist. You must generate voter IDs before starting the server.');
      console.log('Usage: npm run genvoters <count> in the server folder');
      process.exit(1);
    }
    const data = fs.readFileSync(votersPath, 'utf-8');
    const votersArr = JSON.parse(data);
    if (!Array.isArray(votersArr) || votersArr.length === 0) {
      console.log('ERROR: No voter IDs found in voters.json.');
      process.exit(1);
    }
    validVoters = new Set(votersArr);
    voted = new Set();
    voteService.setTotalVoters(validVoters.size);
    resolve(votersArr);
  });
}

async function saveResults() {
  try {
    const results = voteService.getResults(votingOptions);
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const sanitizedSubject = votingSubject.replace(/[^a-zA-Z0-9]/g, '_');
    const resultsPath = path.join(__dirname, '..', `${sanitizedSubject}_${timestamp}.txt`);
    
    const resultLines = [
      `=== Voting Results ===\n`,
      `Subject: ${votingSubject}`,
      `Date: ${new Date().toLocaleString()}\n`,
      `Statistics:`,
      `- Total eligible voters: ${validVoters.size}`,
      `- Total votes cast: ${voted.size}`,
      `- Participation rate: ${((voted.size / validVoters.size) * 100).toFixed(1)}%`,
      `- IP blocking: ${blockMultipleIPVotes ? 'Enabled' : 'Disabled'}\n`,
      `Final Results:`,
      `============`
    ];
    
    // Format each option's results
    const { counts, total } = results;
    counts.forEach((count: number, index: number) => {
      const option = votingOptions[index];
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
      resultLines.push(`${option}: ${count} votes (${percentage}%)`);
    });
    
    const resultText = resultLines.join('\n') + '\n';
    fs.writeFileSync(resultsPath, resultText, 'utf8');
    console.log(`\nResults saved to: ${resultsPath}`);
    return resultsPath;
  } catch (error) {
    console.error('Error saving results:', error);
    return null;
  }
}

// Configure middleware first, before any routes
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Get voting information
app.get('/api/voting-info', (_, res) => {
  if (!votingSubject || votingOptions.length === 0) {
    return res.status(503).json({ error: 'Voting not configured' });
  }
  res.json({
    subject: votingSubject,
    options: votingOptions
  });
});

// Verify voter ID
app.post('/api/verify', (req, res) => {
  const { voterId } = req.body;
  if (!voterId) {
    return res.status(400).json({ error: 'No voter ID provided' });
  }
  res.json({ valid: validVoters.has(voterId) });
});

// Vote endpoint
app.post('/api/vote', (req, res) => {
  try {
    const { voterId, option } = req.body;
    const clientIP = req.ip;

    if (!voterId || typeof option !== 'number' || option < 0 || option >= votingOptions.length) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    if (!validVoters.has(voterId)) {
      return res.status(403).json({ error: 'Invalid voter ID' });
    }

    if (voted.has(voterId)) {
      return res.status(403).json({ error: 'This voter has already voted' });
    }

    if (blockMultipleIPVotes && clientIP && votedIPs.has(clientIP)) {
      return res.status(403).json({ error: 'Multiple votes from same IP are not allowed' });
    }

    voted.add(voterId);
    if (blockMultipleIPVotes && clientIP) {
      votedIPs.add(clientIP);
    }

    voteService.registerVote(voterId, option);
    res.json({ message: 'Vote registered successfully' });
  } catch (error) {
    console.error('Error processing vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function main() {
  try {
    // Configure the voting first
    console.log('=== ZKVote Server Setup ===\n');
    await askVotingConfig();
    
    // Then load voter IDs
    const currentVoters = await loadVoters();
    console.log(`\nLoaded voters: ${currentVoters.length}`);
    console.log('Generated voter IDs:');
    currentVoters.forEach((id: string, idx: number) => console.log(`  ${idx + 1}. ${id}`));
    
    // Start the server last
    console.log('\nStarting server...');
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log('Voting system ready to receive votes!');
      console.log('Press Ctrl+C to stop the server and save results');
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down server...');
      
      // Save results first
      const resultsPath = await saveResults();
      
      // NOTE: Do not remove voters.json on shutdown. Keep voter IDs persistent between runs.
      // If you want to remove the file (e.g., for a one-time demo), uncomment the lines below.
      // if (fs.existsSync(votersPath)) {
      //   fs.unlinkSync(votersPath);
      //   console.log('Cleaned up voter IDs');
      // }

      // Close server
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
main();