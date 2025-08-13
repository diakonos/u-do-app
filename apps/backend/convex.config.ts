import { defineConfig } from "convex/server";
import { auth } from "./convex/auth";

export default defineConfig({
  functions: auth.convexConfig(),
});
