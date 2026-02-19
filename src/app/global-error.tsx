"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <main style={{ padding: "40px", fontFamily: "system-ui, sans-serif" }}>
          <h2>Произошла ошибка</h2>
          <p>Мы уже получили сообщение и работаем над исправлением.</p>
          <button onClick={() => reset()} style={{ marginTop: 12 }}>
            Повторить
          </button>
        </main>
      </body>
    </html>
  );
}

