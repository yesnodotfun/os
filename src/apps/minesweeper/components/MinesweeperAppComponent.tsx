import { useState } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { MinesweeperMenuBar } from "./MinesweeperMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { helpItems, appMetadata } from "..";

const BOARD_SIZE = 9;
const MINES_COUNT = 10;

type CellContent = {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
};

export function MinesweeperAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isNewGameDialogOpen, setIsNewGameDialogOpen] = useState(false);
  const [gameBoard, setGameBoard] = useState<CellContent[][]>(() =>
    initializeBoard()
  );
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  function initializeBoard(): CellContent[][] {
    const board = Array(BOARD_SIZE)
      .fill(null)
      .map(() =>
        Array(BOARD_SIZE)
          .fill(null)
          .map(() => ({
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            neighborMines: 0,
          }))
      );

    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < MINES_COUNT) {
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);
      if (!board[row][col].isMine) {
        board[row][col].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbor mines
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (!board[row][col].isMine) {
          let count = 0;
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              const newRow = row + i;
              const newCol = col + j;
              if (
                newRow >= 0 &&
                newRow < BOARD_SIZE &&
                newCol >= 0 &&
                newCol < BOARD_SIZE &&
                board[newRow][newCol].isMine
              ) {
                count++;
              }
            }
          }
          board[row][col].neighborMines = count;
        }
      }
    }

    return board;
  }

  function handleCellClick(row: number, col: number) {
    if (gameOver || gameWon || gameBoard[row][col].isFlagged) return;

    const newBoard = [...gameBoard.map((row) => [...row])];

    if (newBoard[row][col].isMine) {
      // Game Over
      revealAllMines(newBoard);
      setGameOver(true);
      return;
    }

    revealCell(newBoard, row, col);
    setGameBoard(newBoard);
    checkWinCondition(newBoard);
  }

  function handleCellRightClick(e: React.MouseEvent, row: number, col: number) {
    e.preventDefault();
    if (gameOver || gameWon || gameBoard[row][col].isRevealed) return;

    const newBoard = [...gameBoard.map((row) => [...row])];
    newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged;
    setGameBoard(newBoard);
  }

  function revealCell(board: CellContent[][], row: number, col: number) {
    if (
      row < 0 ||
      row >= BOARD_SIZE ||
      col < 0 ||
      col >= BOARD_SIZE ||
      board[row][col].isRevealed ||
      board[row][col].isFlagged
    ) {
      return;
    }

    board[row][col].isRevealed = true;

    if (board[row][col].neighborMines === 0) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          revealCell(board, row + i, col + j);
        }
      }
    }
  }

  function revealAllMines(board: CellContent[][]) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col].isMine) {
          board[row][col].isRevealed = true;
        }
      }
    }
    setGameBoard(board);
  }

  function checkWinCondition(board: CellContent[][]) {
    const allNonMinesRevealed = board.every((row) =>
      row.every((cell) => cell.isMine || cell.isRevealed)
    );
    if (allNonMinesRevealed) {
      setGameWon(true);
    }
  }

  function startNewGame() {
    setGameBoard(initializeBoard());
    setGameOver(false);
    setGameWon(false);
    setIsNewGameDialogOpen(false);
  }

  if (!isWindowOpen) return null;

  return (
    <>
      <MinesweeperMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onNewGame={() => setIsNewGameDialogOpen(true)}
      />
      <WindowFrame
        title="Minesweeper"
        onClose={onClose}
        isForeground={isForeground}
        appId="minesweeper"
        windowConstraints={{
          minWidth: 310,
          maxWidth: 310,
          minHeight: 405,
          maxHeight: 405,
        }}
      >
        <div className="flex flex-col h-full bg-[#c0c0c0] p-2 w-full">
          <div className="mb-2 flex justify-between items-center px-2 py-1 bg-[#c0c0c0] border-2 border-gray-800 border-r-[3px] border-b-[3px]">
            <div className="bg-black text-red-600 font-[ChicagoKare] text-xl px-2 py-1 border border-t-gray-800 border-l-gray-800 border-r-white border-b-white">
              {MINES_COUNT} mines
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsNewGameDialogOpen(true)}
              className="px-3 py-2 text-2xl leading-none h-auto border-2 border-t-white border-l-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] hover:bg-[#d0d0d0]"
            >
              {gameOver ? "😵" : gameWon ? "😎" : "🙂"}
            </Button>
          </div>
          <div className="grid grid-cols-9 gap-0 bg-gray-800 p-[1px] border-2 border-t-gray-800 border-l-gray-800 border-r-white border-b-white">
            {gameBoard.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded-none
                    ${
                      cell.isRevealed
                        ? "bg-[#d1d1d1] border border-t-gray-600 border-l-gray-600 border-r-[#f0f0f0] border-b-[#f0f0f0]"
                        : "bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-gray-800 border-b-gray-800 hover:bg-[#d0d0d0] active:border active:border-gray-600"
                    }`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  onContextMenu={(e) =>
                    handleCellRightClick(e, rowIndex, colIndex)
                  }
                  disabled={gameOver || gameWon}
                >
                  {cell.isRevealed ? (
                    cell.isMine ? (
                      "💣"
                    ) : cell.neighborMines > 0 ? (
                      <span
                        className={`text-${getNumberColor(
                          cell.neighborMines
                        )} text-lg`}
                      >
                        {cell.neighborMines}
                      </span>
                    ) : null
                  ) : cell.isFlagged ? (
                    "🚩"
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setIsHelpDialogOpen}
          helpItems={helpItems || []}
          appName="Minesweeper"
        />
        <AboutDialog
          isOpen={isAboutDialogOpen}
          onOpenChange={setIsAboutDialogOpen}
          metadata={
            appMetadata || {
              name: "Minesweeper",
              version: "1.0.0",
              creator: { name: "Ryo", url: "https://github.com/ryokun6" },
              github: "https://github.com/ryokun6/soundboard",
              icon: "/icons/minesweeper.png",
            }
          }
        />
        <ConfirmDialog
          isOpen={isNewGameDialogOpen}
          onOpenChange={setIsNewGameDialogOpen}
          onConfirm={startNewGame}
          title="New Game"
          description="Are you sure you want to start a new game?"
        />
      </WindowFrame>
    </>
  );
}

function getNumberColor(num: number): string {
  const colors = [
    "",
    "blue-600",
    "green-600",
    "red-600",
    "purple-600",
    "red-800",
    "cyan-600",
    "black",
    "gray-600",
  ];
  return colors[num] || "black";
}
