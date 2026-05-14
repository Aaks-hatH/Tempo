/**
 * React 19 type fix: @types/react@19 removed `children` from DOMAttributes,
 * which breaks JSX children on all intrinsic HTML elements (button, div, etc.)
 * when TypeScript checks prop types in strict mode.
 *
 * This augmentation restores the expected behaviour so standard JSX patterns
 * like <button><Icon /></button> compile correctly.
 *
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/pull/69022
 */
import "react";

declare module "react" {
  interface DOMAttributes<T> {
    children?: ReactNode | undefined;
  }
}
