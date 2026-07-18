import { describe, expect, test } from "vitest";
import { requestApp } from "./test-helpers";

describe("devices API", () => {
  test("registers a device token successfully", async () => {
    const res = await requestApp("/v1/devices", "POST", {
      expoPushToken: "ExponentPushToken[1234567890123456789012]",
      platform: "ios",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeTypeOf("string");
    expect(body.expoPushToken).toBe(
      "ExponentPushToken[1234567890123456789012]"
    );
    expect(body.platform).toBe("ios");
  });

  test("handles conflict and upserts token for the same token", async () => {
    const token = "ExponentPushToken[conflict-token]";
    // Register first time
    const res1 = await requestApp("/v1/devices", "POST", {
      expoPushToken: token,
      platform: "ios",
    });
    expect(res1.status).toBe(200);
    const body1 = await res1.json();

    // Register second time with updated platform
    const res2 = await requestApp("/v1/devices", "POST", {
      expoPushToken: token,
      platform: "android",
    });
    expect(res2.status).toBe(200);
    const body2 = await res2.json();

    expect(body2.expoPushToken).toBe(token);
    expect(body2.platform).toBe("android");
  });

  test("returns 400 validation error for invalid platform or token format", async () => {
    const res = await requestApp("/v1/devices", "POST", {
      expoPushToken: "bad-token",
      platform: "windows-phone",
    });
    expect(res.status).toBe(400);
  });

  test("deletes a device successfully", async () => {
    const resReg = await requestApp("/v1/devices", "POST", {
      expoPushToken: "ExponentPushToken[to-delete]",
      platform: "ios",
    });
    const regBody = await resReg.json();

    const resDel = await requestApp(`/v1/devices/${regBody.id}`, "DELETE");
    expect(resDel.status).toBe(204);
  });
});
