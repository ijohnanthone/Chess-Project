import { getLegalMoves } from './chess-logic.js';

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

try {
    console.log("Calling getLegalMoves for pawn at 6, 0 without gameState:");
    const moves = getLegalMoves(board, 6, 0, 'white');
    console.log("Moves:", moves);
} catch (e) {
    console.error("Error thrown:", e);
}
