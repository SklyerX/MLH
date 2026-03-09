'use client'

import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'
import { useState } from 'react'
export default function CaseDialog() {



    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="lg">
                    New case
                </Button>
            </DialogTrigger>
            <DialogContent>

            </DialogContent>
        </Dialog>
    )
}
