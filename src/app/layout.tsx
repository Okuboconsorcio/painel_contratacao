import type { Metadata } from "next";
import { Archivo, Instrument_Sans } from "next/font/google";
import "./globals.css";

/**
 * Duas famílias, dois papéis.
 *
 * A Archivo só aparece em marca, títulos e sobrancelhas — tem eixo de largura, e
 * é a largura levemente expandida que dá o ar de instrumento gravado. A
 * Instrument Sans carrega todo o resto: é estreita o bastante para caber muita
 * coluna e tem números que alinham, que é o que este sistema mais faz.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Painel de contratação — Okubo",
  description: "Painel de contratação da Okubo Consórcio e MGCON: vagas, candidatos e banco de currículos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
