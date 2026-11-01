import * as React from "react"
import { cn } from "cn"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<"div"> & { value: number }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      data-slot="progress"
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </div>
  )
}

export { Progress }
