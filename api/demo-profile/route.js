// app/api/demo-profile/route.js

import { NextResponse } from "next/server";
import {
  getAvailableUsers,
  getUserDataset,
} from "../../../lib/dataset";

function normalizeUserId(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    let userId = normalizeUserId(
      searchParams.get("userId")
    );

    if (!userId) {
      const users = getAvailableUsers();

      if (users.length === 0) {
        return NextResponse.json(
          {
            error:
              "No synthetic users were found.",
          },
          {
            status: 500,
          }
        );
      }

      const randomUser =
        users[
          Math.floor(
            Math.random() * users.length
          )
        ];

      userId = normalizeUserId(
        randomUser.userId
      );
    }

    const data = getUserDataset(userId);

    if (!data) {
      return NextResponse.json(
        {
          error: `Synthetic user ${userId} was not found.`,
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      userId,
      ...data,
    });
  } catch (error) {
    console.error(
      "Demo profile API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load the synthetic financial profile.",
      },
      {
        status: 500,
      }
    );
  }
}