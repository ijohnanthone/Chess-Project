import { getPieceColor, getLegalMoves, isKingInCheck, applyMove, initialGameState } from './chess-logic.js';

const PIECE_VALUES = {
    'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000, // White pieces
    'p': -100, 'n': -320, 'b': -330, 'r': -500, 'q': -900, 'k': -20000, // Black pieces
    ' ': 0
};

// Advanced Piece-Square Tables (PSTs) to reward positional play
const PAWN_PST = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_PST = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_PST = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_PST = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
];

const QUEEN_PST = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  5,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_PST = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
];

const PST_TABLES = {
    'P': PAWN_PST,
    'N': KNIGHT_PST,
    'B': BISHOP_PST,
    'R': ROOK_PST,
    'Q': QUEEN_PST,
    'K': KING_PST
};

// Advanced evaluation incorporating material and piece-square tables
export function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece !== ' ') {
                const value = PIECE_VALUES[piece];
                score += value;

                const upperPiece = piece.toUpperCase();
                const pstTable = PST_TABLES[upperPiece];
                if (pstTable) {
                    const isWhite = (piece === upperPiece);
                    if (isWhite) {
                        score += pstTable[r][c];
                    } else {
                        score -= pstTable[7 - r][c];
                    }
                }
            }
        }
    }
    return score;
}

// Move Ordering Heuristics (Checks, captures, promotions sorted first)
export function scoreMove(board, move, currentPlayerColor) {
    let score = 0;
    const piece = board[move.startRow][move.startCol];
    const target = board[move.endRow][move.endCol];

    // Capture heuristic (MVV-LVA: Most Valuable Victim - Least Valuable Assault)
    if (target !== ' ') {
        score += 10000 + (Math.abs(PIECE_VALUES[target]) - Math.abs(PIECE_VALUES[piece]) / 100);
    }

    // Promotion heuristic
    if (piece.toUpperCase() === 'P' && (move.endRow === 0 || move.endRow === 7)) {
        score += 8000;
    }

    // Positional improvement differential (PST score change)
    const pstTable = PST_TABLES[piece.toUpperCase()];
    if (pstTable) {
        const isWhite = (currentPlayerColor === 'white');
        const oldPst = isWhite ? pstTable[move.startRow][move.startCol] : pstTable[7 - move.startRow][move.startCol];
        const newPst = isWhite ? pstTable[move.endRow][move.endCol] : pstTable[7 - move.endRow][move.endCol];
        score += (newPst - oldPst) * 2;
    }

    return score;
}

// Transposition Table for caching positions
const transpositionTable = new Map();

// Zobrist Hashing variables
let zobristTable = [];
let zobristInitialized = false;

function initZobrist() {
    if (zobristInitialized) return;
    zobristTable = [];
    const pieces = ['P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k', ' '];
    for (let r = 0; r < 8; r++) {
        zobristTable[r] = [];
        for (let c = 0; c < 8; c++) {
            zobristTable[r][c] = {};
            pieces.forEach(p => {
                // Generate a random 32-bit integer
                zobristTable[r][c][p] = Math.floor(Math.random() * 0xFFFFFFFF);
            });
        }
    }
    zobristInitialized = true;
}

function computeHash(board) {
    initZobrist();
    let hash = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            hash ^= zobristTable[r][c][piece];
        }
    }
    return hash;
}

// Track evaluated nodes for stats reporting
let nodesEvaluated = 0;

// Helper to filter and return capture moves
function getCaptureMoves(board, color, gameState) {
    const captureMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece !== ' ' && getPieceColor(piece) === color) {
                const moves = getLegalMoves(board, r, c, color, gameState);
                for (const m of moves) {
                    if (m.isCapture) {
                        captureMoves.push(m);
                    }
                }
            }
        }
    }
    return captureMoves;
}

// Quiescence Search to avoid the horizon effect
function quiescence(board, alpha, beta, maximizingPlayer, aiColor, gameState) {
    nodesEvaluated++;
    
    // Normalize evaluation: positive is good for AI, negative is bad
    const standPat = evaluateBoard(board) * (aiColor === 'white' ? 1 : -1);
    
    if (maximizingPlayer) {
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;
        
        let captures = getCaptureMoves(board, aiColor, gameState);
        captures.sort((a, b) => scoreMove(board, b, aiColor) - scoreMove(board, a, aiColor));
        
        for (const move of captures) {
            const { newBoard, newGameState } = applyMove(board, move, gameState);
            const val = quiescence(newBoard, alpha, beta, false, aiColor, newGameState);
            if (val >= beta) return beta;
            if (val > alpha) alpha = val;
        }
        return alpha;
    } else {
        if (standPat <= alpha) return alpha;
        if (standPat < beta) beta = standPat;
        
        const opponentColor = aiColor === 'white' ? 'black' : 'white';
        let captures = getCaptureMoves(board, opponentColor, gameState);
        captures.sort((a, b) => scoreMove(board, b, opponentColor) - scoreMove(board, a, opponentColor));
        
        for (const move of captures) {
            const { newBoard, newGameState } = applyMove(board, move, gameState);
            const val = quiescence(newBoard, alpha, beta, true, aiColor, newGameState);
            if (val <= alpha) return alpha;
            if (val < beta) beta = val;
        }
        return beta;
    }
}

// Minimax algorithm with alpha-beta pruning and transposition table
export function minimax(board, depth, alpha, beta, maximizingPlayer, aiColor, gameState = initialGameState, startTime = 0, timeLimit = 2000) {
    nodesEvaluated++;

    // Check time limit periodically to stop search early
    if (nodesEvaluated % 2048 === 0 && startTime > 0) {
        if (Date.now() - startTime > timeLimit) {
            return maximizingPlayer ? -Infinity : Infinity;
        }
    }

    if (depth === 0) {
        return quiescence(board, alpha, beta, maximizingPlayer, aiColor, gameState);
    }

    const currentPlayerColor = maximizingPlayer ? aiColor : (aiColor === 'white' ? 'black' : 'white');
    
    // Transposition Table lookup
    const boardHash = computeHash(board);
    const ttEntry = transpositionTable.get(boardHash);
    if (ttEntry && ttEntry.depth >= depth) {
        if (ttEntry.flag === 0) return ttEntry.value; // EXACT
        if (ttEntry.flag === 1 && ttEntry.value <= alpha) return alpha; // ALPHA
        if (ttEntry.flag === 2 && ttEntry.value >= beta) return beta; // BETA
    }

    let allPossibleMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            allPossibleMoves = allPossibleMoves.concat(getLegalMoves(board, r, c, currentPlayerColor, gameState));
        }
    }

    if (allPossibleMoves.length === 0) {
        const inCheck = isKingInCheck(board, currentPlayerColor, gameState);
        if (inCheck) {
            // Checkmate: return very bad score for maximizing player, good score for minimizing player
            return maximizingPlayer ? (-500000 - depth) : (500000 + depth);
        } else {
            // Stalemate: neutral score
            return 0;
        }
    }

    // Sort moves to evaluate high-impact moves first
    allPossibleMoves.sort((a, b) => scoreMove(board, b, currentPlayerColor) - scoreMove(board, a, currentPlayerColor));

    let bestValue = maximizingPlayer ? -Infinity : Infinity;
    let bestMove = null;

    if (maximizingPlayer) {
        for (const move of allPossibleMoves) {
            const { newBoard, newGameState } = applyMove(board, move, gameState);
            const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, aiColor, newGameState, startTime, timeLimit);
            
            if (evaluation > bestValue) {
                bestValue = evaluation;
                bestMove = move;
            }
            alpha = Math.max(alpha, bestValue);
            if (beta <= alpha) {
                break; // Alpha-beta pruning
            }
        }
        
        // Save to Transposition Table
        let flag = 0; // EXACT
        if (bestValue <= alpha) flag = 1; // ALPHA
        else if (bestValue >= beta) flag = 2; // BETA
        transpositionTable.set(boardHash, { depth, value: bestValue, flag, bestMove });
        
        return bestValue;
    } else {
        for (const move of allPossibleMoves) {
            const { newBoard, newGameState } = applyMove(board, move, gameState);
            const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, aiColor, newGameState, startTime, timeLimit);
            
            if (evaluation < bestValue) {
                bestValue = evaluation;
                bestMove = move;
            }
            beta = Math.min(beta, bestValue);
            if (beta <= alpha) {
                break; // Alpha-beta pruning
            }
        }
        
        // Save to Transposition Table
        let flag = 0; // EXACT
        if (bestValue <= alpha) flag = 1; // ALPHA
        else if (bestValue >= beta) flag = 2; // BETA
        transpositionTable.set(boardHash, { depth, value: bestValue, flag, bestMove });
        
        return bestValue;
    }
}

export function findBestMove(board, aiColor, gameState = initialGameState, maxDepth = 6) {
    const startTime = Date.now();
    const timeLimit = 2000; // 2 seconds search limit
    let bestMove = null;
    nodesEvaluated = 0;

    transpositionTable.clear();

    let allPossibleMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            allPossibleMoves = allPossibleMoves.concat(getLegalMoves(board, r, c, aiColor, gameState));
        }
    }

    if (allPossibleMoves.length === 0) return null;

    // Initial Move Ordering
    allPossibleMoves.sort((a, b) => scoreMove(board, b, aiColor) - scoreMove(board, a, aiColor));

    // Iterative Deepening Search
    for (let currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
        if (Date.now() - startTime > timeLimit) {
            break;
        }

        let bestValue = -Infinity;
        let depthBestMove = null;

        for (const move of allPossibleMoves) {
            const { newBoard, newGameState } = applyMove(board, move, gameState);
            const moveValue = minimax(newBoard, currentDepth - 1, -Infinity, Infinity, false, aiColor, newGameState, startTime, timeLimit);
            
            if (Date.now() - startTime > timeLimit && bestMove !== null) {
                break; // Ignore partial/incomplete search results on timeout
            }

            if (moveValue > bestValue) {
                bestValue = moveValue;
                depthBestMove = move;
            }
        }

        if (depthBestMove) {
            bestMove = depthBestMove;
            
            // Move Ordering Enhancement: prioritize the best move found in subsequent searches
            const idx = allPossibleMoves.indexOf(bestMove);
            if (idx > 0) {
                allPossibleMoves.splice(idx, 1);
                allPossibleMoves.unshift(bestMove);
            }
        }

        // Post status updates to Web Worker if active
        if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
            self.postMessage({
                status: 'searching',
                depth: currentDepth,
                nodes: nodesEvaluated,
                timeSpent: Date.now() - startTime
            });
        }
    }

    // Report final results to worker
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
        self.postMessage({
            status: 'complete',
            bestMove,
            depth: maxDepth,
            nodes: nodesEvaluated,
            timeSpent: Date.now() - startTime
        });
    }

    return bestMove;
}
