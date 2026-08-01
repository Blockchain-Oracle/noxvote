import { useEffect, useId, useState } from 'react'

/* ORBIT diagram theme — DESIGN.md tokens. Nodes are lifted cards with dust
 * hairlines; connections are ember, which is graphical by law. Light-only. */
const brandTheme = {
  theme: 'base' as const,
  themeVariables: {
    darkMode: false,
    background: '#f3f0ee',
    fontFamily: "'Sofia Sans', Arial, sans-serif",
    fontSize: '15px',
    primaryColor: '#fcfbfa',
    primaryTextColor: '#141413',
    primaryBorderColor: '#d1cdc7',
    secondaryColor: '#e8e2da',
    secondaryTextColor: '#141413',
    secondaryBorderColor: '#d1cdc7',
    tertiaryColor: '#f3f0ee',
    tertiaryTextColor: '#696969',
    tertiaryBorderColor: '#d1cdc7',
    lineColor: '#c04a1e',
    textColor: '#141413',
    mainBkg: '#fcfbfa',
    nodeBorder: '#d1cdc7',
    clusterBkg: '#f3f0ee',
    clusterBorder: '#d1cdc7',
    edgeLabelBackground: '#f3f0ee',
    actorBkg: '#fcfbfa',
    actorBorder: '#d1cdc7',
    actorTextColor: '#141413',
    signalColor: '#c04a1e',
    signalTextColor: '#141413',
    labelBoxBkgColor: '#e8e2da',
    labelBoxBorderColor: '#d1cdc7',
    labelTextColor: '#141413',
    loopTextColor: '#696969',
    noteBkgColor: '#e8e2da',
    noteTextColor: '#141413',
    noteBorderColor: '#d1cdc7',
  },
}

export function Mermaid({ chart }: { readonly chart: string }) {
  const rawId = useId()
  const [svg, setSvg] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    const id = `noxm${rawId.replace(/[^a-zA-Z0-9]/gu, '')}`
    void import('mermaid')
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', ...brandTheme })
        const rendered = await mermaid.render(id, chart)
        if (alive) setSvg(rendered.svg)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [chart, rawId])

  if (failed) {
    return (
      <pre className="nox-mermaid text-xs whitespace-pre-wrap">
        <code>{chart}</code>
      </pre>
    )
  }
  if (!svg) return <div className="nox-mermaid text-fd-muted-foreground text-sm">Rendering diagram…</div>
  return <div className="nox-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
}
