import { Router } from "express";
import { getHomepageContent } from "../homepageContent.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const content = await getHomepageContent();

    return res.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error("Load public homepage content error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load homepage content.",
    });
  }
});

export default router;