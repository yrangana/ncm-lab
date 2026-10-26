import { mountHeader } from "/shared/lab.js";
import { mountSudoku } from "./sudoku.js";

mountHeader(document.getElementById("hdr"), "sudoku");
mountSudoku(document.getElementById("sudoku"));
