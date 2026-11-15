/* Biçimlendirici çıktısını (AST) React düğümlerine çevirir. Metin her zaman düz metin düğümü olarak basılır. */
import { Fragment } from "react";
import { cn } from "@/ui";
import type { Blok, Satir } from "./bicimleyici";

function Satirlar({ satir }: { satir: Satir }) {
  return (
    <>
      {satir.map((p, i) => (p.t === "k" ? <strong key={i} className="font-semibold">{p.s}</strong> : <Fragment key={i}>{p.s}</Fragment>))}
    </>
  );
}

export function Bloklar({ bloklar, className }: { bloklar: readonly Blok[]; className?: string }) {
  return (
    <div className={cn("selectable flex flex-col gap-2 text-sm leading-relaxed", className)}>
      {bloklar.map((b, i) => {
        if (b.t === "p") {
          return (
            <p key={i}>
              {b.satirlar.map((s, j) => (
                <Fragment key={j}>
                  {j > 0 ? <br /> : null}
                  <Satirlar satir={s} />
                </Fragment>
              ))}
            </p>
          );
        }
        const Etiket = b.t === "ul" ? "ul" : "ol";
        return (
          <Etiket key={i} className={cn("flex flex-col gap-1 pl-5", b.t === "ul" ? "list-disc" : "list-decimal")}>
            {b.ogeler.map((s, j) => (
              <li key={j}>
                <Satirlar satir={s} />
              </li>
            ))}
          </Etiket>
        );
      })}
    </div>
  );
}
