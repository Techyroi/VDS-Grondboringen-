
const express = require("express");
const Lead = require("../models/Lead");

const router = express.Router();

const STATUSES = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Appointment Booked",
  "Proposal Sent",
  "Won",
  "Lost"
];

function requireCrmLogin(req, res, next) {
  if (req.session && req.session.crmUser) return next();

  return res.status(401).json({
    success: false,
    message: "Please log in to the CRM."
  });
}

const ALLOWED_TYPES = [
  "Homeowner",
  "Investor",
  "Real estate developer",
  "Other"
];

async function createLead(data, source) {
  const lead = await Lead.create({
    ...data,
    source,
    status: "New Lead"
  });

  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (webhookUrl) {
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VDS-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET || ""
        },
        body: JSON.stringify({
          event: "new_lead",
          lead: {
            id: lead._id.toString(),
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            customerType: lead.customerType,
            preferredDay: lead.preferredDay,
            message: lead.message,
            source: lead.source,
            status: lead.status,
            createdAt: lead.createdAt
          }
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (!webhookResponse.ok) {
        console.error("n8n webhook returned status:", webhookResponse.status);
      }
    } catch (error) {
      console.error(
        "n8n notification failed; lead remains saved:",
        error.message
      );
    }
  }

  return lead;
}

function validateLead(body) {
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const customerType = String(body.customerType || "Homeowner");
  const preferredDay = String(body.preferredDay || "").trim();
  const message = String(body.message || "").trim();

  if (!name || !phone || !email) {
    return {
      error: "Name, phone, and email are required."
    };
  }

  if (
    name.length > 120 ||
    phone.length > 40 ||
    email.length > 254 ||
    preferredDay.length > 20 ||
    message.length > 3000
  ) {
    return {
      error: "One or more fields are too long."
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  return {
    data: {
      name,
      phone,
      email,
      customerType: ALLOWED_TYPES.includes(customerType)
        ? customerType
        : "Other",
      preferredDay,
      message
    }
  };
}

// Public website form.
router.post("/", async (req, res, next) => {
  try {
    const validated = validateLead(req.body);

    if (validated.error) {
      return res.status(400).json({
        success: false,
        message: validated.error
      });
    }

    const lead = await createLead(validated.data, "website");

    return res.status(201).json({
      success: true,
      message: "Your request has been received. We will contact you to confirm the details.",
      leadId: lead._id
    });
  } catch (error) {
    next(error);
  }
});

// Dedicated public chat lead submission.
// The chat interface must call this only after the visitor confirms.
router.post("/chat", async (req, res, next) => {
  try {
    const validated = validateLead(req.body);

    if (validated.error) {
      return res.status(400).json({
        success: false,
        message: validated.error
      });
    }

    const lead = await createLead(validated.data, "chat");

    return res.status(201).json({
      success: true,
      message: "Your request has been received. We will contact you to confirm the details.",
      leadId: lead._id
    });
  } catch (error) {
    next(error);
  }
});

// All endpoints below this line require CRM login.
router.use(requireCrmLogin);

router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim().slice(0, 100);
    const status = String(req.query.status || "").trim();
    const filter = {};

    if (status && STATUSES.includes(status)) {
      filter.status = status;
    }

    if (q) {
      const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: safeQ, $options: "i" } },
        { email: { $regex: safeQ, $options: "i" } },
        { phone: { $regex: safeQ, $options: "i" } }
      ];
    }

    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    res.json({ success: true, data: leads });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const updates = {};

    if (
      typeof req.body.status === "string" &&
      STATUSES.includes(req.body.status)
    ) {
      updates.status = req.body.status;
    } else if (req.body.status !== undefined) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead status."
      });
    }

    if (typeof req.body.notes === "string") {
      if (req.body.notes.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Notes are too long."
        });
      }

      updates.notes = req.body.notes;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: "No valid updates provided."
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).lean();

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found."
      });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
