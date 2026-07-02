"use client";

import { RouteError } from "../components/route-error";

export default function FoleyRoomError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Foley Room" {...props} />;
}
