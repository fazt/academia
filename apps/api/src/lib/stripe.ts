import Stripe from "stripe";
import { env } from "../env";
import { serviceUnavailable } from "./errors";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw serviceUnavailable("Los pagos no están configurados (falta STRIPE_SECRET_KEY)");
  }
  client ??= new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}
