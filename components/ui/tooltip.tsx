"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TooltipContext = React.createContext<TooltipContextType | undefined>(undefined)

const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}

const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = React.useState(false)

  return (
    <TooltipContext.Provider value={{ open, onOpenChange: setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean; children: React.ReactNode }
>(({ asChild = false, children, ...props }, ref) => {
  const context = React.useContext(TooltipContext)
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ...props,
      onMouseEnter: () => context?.onOpenChange(true),
      onMouseLeave: () => context?.onOpenChange(false),
    })
  }

  return (
    <div
      {...props}
      onMouseEnter={() => context?.onOpenChange(true)}
      onMouseLeave={() => context?.onOpenChange(false)}
    >
      {children}
    </div>
  )
})

TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: "top" | "right" | "bottom" | "left"
    align?: "start" | "center" | "end"
  }
>(({ className, side = "top", align = "center", ...props }, ref) => {
  const context = React.useContext(TooltipContext)

  if (!context?.open) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        side === "top" && "bottom-full mb-2 left-1/2 -translate-x-1/2",
        side === "bottom" && "top-full mt-2 left-1/2 -translate-x-1/2",
        side === "left" && "right-full mr-2 top-1/2 -translate-y-1/2",
        side === "right" && "left-full ml-2 top-1/2 -translate-y-1/2",
        className
      )}
      {...props}
    />
  )
})

TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }