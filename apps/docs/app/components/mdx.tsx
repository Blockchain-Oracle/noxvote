import defaultMdxComponents from 'fumadocs-ui/mdx'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import type { MDXComponents } from 'mdx/types'
import { Mermaid } from './mermaid'

export function getMDXComponents() {
  return {
    ...defaultMdxComponents,
    Mermaid,
    Step,
    Steps,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
