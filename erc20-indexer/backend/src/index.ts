import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db/database.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 获取某个地址的转账记录
app.get("/api/transfers/:address", (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const { page = "1", limit = "20", type } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let query = "";
    let params: any[] = [];

    if (type === "sent") {
      query = `
        SELECT * FROM transfers 
        WHERE from_address = ? 
        ORDER BY block_number DESC, id DESC 
        LIMIT ? OFFSET ?
      `;
      params = [address, limitNum, offset];
    } else if (type === "received") {
      query = `
        SELECT * FROM transfers 
        WHERE to_address = ? 
        ORDER BY block_number DESC, id DESC 
        LIMIT ? OFFSET ?
      `;
      params = [address, limitNum, offset];
    } else {
      query = `
        SELECT * FROM transfers 
        WHERE from_address = ? OR to_address = ? 
        ORDER BY block_number DESC, id DESC 
        LIMIT ? OFFSET ?
      `;
      params = [address, address, limitNum, offset];
    }

    const stmt = db.prepare(query);
    const transfers = stmt.all(...params);

    // 获取总数
    let countQuery = "";
    let countParams: any[] = [];

    if (type === "sent") {
      countQuery = "SELECT COUNT(*) as total FROM transfers WHERE from_address = ?";
      countParams = [address];
    } else if (type === "received") {
      countQuery = "SELECT COUNT(*) as total FROM transfers WHERE to_address = ?";
      countParams = [address];
    } else {
      countQuery = "SELECT COUNT(*) as total FROM transfers WHERE from_address = ? OR to_address = ?";
      countParams = [address, address];
    }

    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...countParams) as { total: number };

    res.json({
      success: true,
      data: transfers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("获取转账记录错误:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 获取转账统计信息
app.get("/api/transfers/:address/stats", (req, res) => {
  try {
    const address = req.params.address.toLowerCase();

    const sentStmt = db.prepare(`
      SELECT COUNT(*) as count, SUM(value_decimal) as total 
      FROM transfers 
      WHERE from_address = ?
    `);
    const sentResult = sentStmt.get(address) as { count: number; total: number | null };

    const receivedStmt = db.prepare(`
      SELECT COUNT(*) as count, SUM(value_decimal) as total 
      FROM transfers 
      WHERE to_address = ?
    `);
    const receivedResult = receivedStmt.get(address) as { count: number; total: number | null };

    res.json({
      success: true,
      data: {
        sent: {
          count: sentResult.count,
          total: sentResult.total || 0,
        },
        received: {
          count: receivedResult.count,
          total: receivedResult.total || 0,
        },
      },
    });
  } catch (error: any) {
    console.error("获取统计信息错误:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});
