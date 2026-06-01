import { findBestMove } from './chess-ai.js';

self.onmessage = function (e) {
    const { board, aiColor, gameState } = e.data;
    
    // Calculate best move with depth 6 and full iterative deepening
    const bestMove = findBestMove(board, aiColor, gameState, 6);
    
    self.postMessage({
        status: 'complete',
        bestMove
    });
};
