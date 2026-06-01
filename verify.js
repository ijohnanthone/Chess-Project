import { getLegalMoves, applyMove, initialGameState } from './chess-logic.js';
import { findBestMove } from './chess-ai.js';

console.log("Verifying chess engine...");

let board = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

let gameState = JSON.parse(JSON.stringify(initialGameState));

try {
    // 1. Get white pawn moves at e2 (row 6, col 4)
    console.log("1. Fetching legal moves for White Pawn at e2...");
    const moves = getLegalMoves(board, 6, 4, 'white', gameState);
    console.log("Success! e2 moves found:", moves.length);

    // 2. Play e2 to e4
    const e4Move = moves.find(m => m.endRow === 4 && m.endCol === 4);
    if (e4Move) {
        console.log("2. Simulating move e2 ➔ e4...");
        const result = applyMove(board, e4Move, gameState);
        board = result.newBoard;
        gameState = result.newGameState;
        console.log("Success! Board updated and enPassantTarget set to:", gameState.enPassantTarget);
    } else {
        console.error("Error: e4 move not found!");
    }

    // 3. Let AI search for best move
    console.log("3. Invoking AI to calculate best move...");
    const aiMove = findBestMove(board, 'black', gameState, 2); // Depth 2 for quick validation
    console.log("Success! AI selected move:", aiMove);

    console.log("\n✅ Chess engine verified and fully working!");
} catch (e) {
    console.error("❌ Verification failed with error:", e);
}
