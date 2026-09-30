// -------------------------------------------------------------
// ROVIX SCRIPTING ENGINE (BACKWARDS COMPATIBILITY WRAPPER)
// Re-exports the modern modular Luau engine from /src/scripting/
// -------------------------------------------------------------

import * as THREE from 'three';
import { StudioPart } from './gamesStorage.ts';

export * from '../scripting/index.ts';
import {
  RBXVector3,
  RBXColor3,
  RBXCFrame,
  RBXTweenInfo,
  RBXEnum,
  RBXScriptSignal,
  RBXInstance,
  RBXBasePart,
  RBXPart,
  RBXHumanoid,
  RBXModel,
  LuauRuntime as ModernLuauRuntime,
} from '../scripting/index.ts';

export interface OutputLogMessage {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

// -------------------------------------------------------------
// LUA SCRIPT TEMPLATES FOR STUDIO SCRIPT EDITOR
// -------------------------------------------------------------
export const LUA_SCRIPT_TEMPLATES = [
  {
    id: 'kill_brick',
    title: '🔴 Lava Kill Brick',
    category: 'Obstacles',
    description: 'Instantly eliminates the player upon contact with the brick.',
    source: `-- 🔴 Lava Kill Brick
local part = script.Parent

part.Touched:Connect(function(hit)
    local humanoid = hit.Parent:FindFirstChild("Humanoid")
    if humanoid then
        humanoid.Health = 0
        print(hit.Parent.Name .. " was eliminated by " .. part.Name .. "!")
    end
end)
`,
  },
  {
    id: 'elevator_tweenservice',
    title: '🛗 TweenService Elevator',
    category: 'Mechanics',
    description: 'Smoothly moves a platform up and down using TweenService and Easing.',
    source: `-- 🛗 Smooth Moving Elevator via TweenService
local TweenService = game:GetService("TweenService")
local part = script.Parent

local startPos = part.Position
local targetPos = startPos + Vector3.new(0, 14, 0)

while true do
    -- Move Up
    local tweenUp = TweenService:Create(
        part,
        TweenInfo.new(3, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut),
        { Position = targetPos }
    )
    tweenUp:Play()
    tweenUp.Completed:Wait()

    task.wait(1.0)

    -- Move Down
    local tweenDown = TweenService:Create(
        part,
        TweenInfo.new(3, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut),
        { Position = startPos }
    )
    tweenDown:Play()
    tweenDown.Completed:Wait()

    task.wait(1.0)
end
`,
  },
  {
    id: 'click_the_button_game',
    title: '🔴 Click the Button [BETA] (3D Number Counter)',
    category: 'Full Games',
    description: '3D Voxel digital counter board updating click numbers with TweenService button animation & trophies.',
    source: `-- 🔴 Click the button [BETA]
local button = script.Parent
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")

print("=========================================")
print("🎮 CLICK THE BUTTON [BETA] LOADED!")
print("Click the big red button to count clicks in 3D!")
print("=========================================")

-- Attach ClickDetector
local clickDetector = button:FindFirstChildOfClass("ClickDetector")
if not clickDetector then
    clickDetector = Instance.new("ClickDetector")
    clickDetector.MaxActivationDistance = 100
    clickDetector.Parent = button
end

local clicks = 0
local initialButtonPos = button.Position
local isAnimating = false

-- 3D Number Digit Bitmaps (3 columns wide x 5 rows high)
local digitBitmaps = {
    ["0"] = { "111", "101", "101", "101", "111" },
    ["1"] = { "010", "110", "010", "010", "111" },
    ["2"] = { "111", "001", "111", "100", "111" },
    ["3"] = { "111", "001", "111", "001", "111" },
    ["4"] = { "101", "101", "111", "001", "001" },
    ["5"] = { "111", "100", "111", "001", "111" },
    ["6"] = { "111", "100", "111", "101", "111" },
    ["7"] = { "111", "001", "010", "010", "010" },
    ["8"] = { "111", "101", "111", "101", "111" },
    ["9"] = { "111", "101", "111", "001", "111" }
}

-- Array storing currently active 3D pixel parts for the display
local activePixelParts = {}

-- Function to clear and rebuild the 3D number display in front of the button
local function renderNumber(num)
    -- Clean up old number parts
    for i = 1, #activePixelParts do
        if activePixelParts[i] then
            activePixelParts[i]:Destroy()
        end
    end
    activePixelParts = {}

    local str = tostring(num)
    local numDigits = string.len(str)
    
    -- Board anchor position (in front of button: Z = -4, Y = 9.5)
    local baseCenter = Vector3.new(0, 9.5, -4)
    local pixelSize = 0.55
    local digitWidth = 3 * pixelSize
    local digitSpacing = 0.6
    local totalWidth = numDigits * digitWidth + (numDigits - 1) * digitSpacing
    local startX = baseCenter.X - (totalWidth / 2) + (pixelSize / 2)

    for d = 1, numDigits do
        local ch = string.sub(str, d, d)
        local bitmap = digitBitmaps[ch]
        local digitOffsetX = startX + (d - 1) * (digitWidth + digitSpacing)

        if bitmap then
            for row = 1, 5 do
                local line = bitmap[row]
                local posY = baseCenter.Y + (5 - row) * pixelSize

                for col = 1, 3 do
                    local charBit = string.sub(line, col, col)
                    if charBit == "1" then
                        local posX = digitOffsetX + (col - 1) * pixelSize
                        local pixel = Instance.new("Part")
                        pixel.Name = "NumPixel_" .. d .. "_" .. row .. "_" .. col
                        pixel.Size = Vector3.new(pixelSize * 0.92, pixelSize * 0.92, 0.4)
                        pixel.Position = Vector3.new(posX, posY, baseCenter.Z)
                        pixel.Material = Enum.Material.Neon
                        pixel.Color = Color3.fromRGB(0, 240, 255)
                        pixel.Anchored = true
                        pixel.CanCollide = false
                        pixel.Parent = workspace
                        table.insert(activePixelParts, pixel)
                    end
                end
            end
        end
    end
end

-- Render initial 0
renderNumber(0)

-- ClickDetector Event Handler
clickDetector.MouseClick:Connect(function(player)
    clicks = clicks + 1
    print("🔴 [BUTTON CLICKED!] Total Clicks: " .. clicks .. " (Clicked by: " .. player.Name .. ")")

    -- Update 3D Number Parts in front of the button
    renderNumber(clicks)

    -- Button press animation with TweenService
    if not isAnimating then
        isAnimating = true
        task.spawn(function()
            button.Color = Color3.fromRGB(255, 220, 0)
            button.Material = Enum.Material.Neon

            local pressTween = TweenService:Create(
                button,
                TweenInfo.new(0.06, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
                { Position = initialButtonPos - Vector3.new(0, 0.45, 0) }
            )
            pressTween:Play()
            pressTween.Completed:Wait()

            local releaseTween = TweenService:Create(
                button,
                TweenInfo.new(0.12, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
                { Position = initialButtonPos }
            )
            releaseTween:Play()
            releaseTween.Completed:Wait()

            button.Color = Color3.fromRGB(255, 30, 30)
            button.Material = Enum.Material.Plastic
            isAnimating = false
        end)
    end

    -- Spawn a floating click trophy / cube in front of the button
    task.spawn(function()
        local trophy = Instance.new("Part")
        trophy.Name = "ClickTrophy_" .. clicks
        trophy.Size = Vector3.new(0.8, 0.8, 0.8)
        trophy.Position = button.Position + Vector3.new(math.random(-3, 3) * 0.7, 1.5, math.random(-2, 2) * 0.7)
        trophy.Material = Enum.Material.Neon
        trophy.Color = Color3.fromHSV((clicks * 0.08) % 1.0, 1, 1)
        trophy.Anchored = true
        trophy.CanCollide = false
        trophy.Parent = workspace

        local floatTween = TweenService:Create(
            trophy,
            TweenInfo.new(1.2, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
            {
                Position = trophy.Position + Vector3.new(0, 4.5, 0),
                Transparency = 1
            }
        )
        floatTween:Play()
        floatTween.Completed:Wait()
        trophy:Destroy()
    end)

    -- Special Milestones (every 10 clicks)
    if clicks % 10 == 0 then
        print("🎉 [MILESTONE REACHED!] " .. clicks .. " CLICKS!")
        task.spawn(function()
            for i = 1, #activePixelParts do
                if activePixelParts[i] then
                    activePixelParts[i].Color = Color3.fromRGB(255, 215, 0)
                end
            end
            task.wait(0.3)
            for i = 1, #activePixelParts do
                if activePixelParts[i] then
                    activePixelParts[i].Color = Color3.fromRGB(0, 240, 255)
                end
            end
        end)
    end
end)

-- Hover Effects
clickDetector.MouseHoverEnter:Connect(function(player)
    if not isAnimating then
        button.Color = Color3.fromRGB(255, 80, 80)
    end
end)

clickDetector.MouseHoverLeave:Connect(function(player)
    if not isAnimating then
        button.Color = Color3.fromRGB(255, 30, 30)
    end
end)
`,
  },
  {
    id: 'clickdetector_disappear',
    title: '🖱️ ClickDetector Disappear & Ghost',
    category: 'Interactive',
    description: 'Creates ClickDetector dynamically, turns invisible and non-solid when clicked.',
    source: `-- 🖱️ ClickDetector Disappear & Ghost
local part = script.Parent

local detector = Instance.new("ClickDetector")
detector.MaxActivationDistance = 100
detector.Parent = part

detector.MouseClick:Connect(function(player)
    print("PART CLICKED")
    print("Player: " .. player.Name)

    part.Transparency = 1
    part.CanCollide = false
end)
`,
  },
  {
    id: 'click_detector_color',
    title: '🖱️ ClickDetector Color Switcher',
    category: 'Interactive',
    description: 'Changes color and prints player name when clicked with mouse in 3D.',
    source: `-- 🖱️ ClickDetector Interaction
local part = script.Parent
local clickDetector = part:FindFirstChild("ClickDetector") or Instance.new("ClickDetector", part)

clickDetector.MouseClick:Connect(function(player)
    part.Color = Color3.fromRGB(math.random(50, 255), math.random(50, 255), math.random(50, 255))
    print(player.Name .. " clicked " .. part.Name .. "!")
end)

clickDetector.MouseHoverEnter:Connect(function(player)
    part.Transparency = 0.3
end)

clickDetector.MouseHoverLeave:Connect(function(player)
    part.Transparency = 0
end)
`,
  },
  {
    id: 'rotating_spinner',
    title: '🌀 Continuous Rotating Spinner',
    category: 'Obstacles',
    description: 'Spins continuously around the Y-axis every frame.',
    source: `-- 🌀 Continuous Rotating Spinner
local part = script.Parent

while true do
    part.Orientation = part.Orientation + Vector3.new(0, 3, 0)
    task.wait(0.03)
end
`,
  },
  {
    id: 'fading_platform',
    title: '🌫️ Disappearing / Fading Platform',
    category: 'Obby',
    description: 'Fades out when touched, turns non-solid, then reappears.',
    source: `-- 🌫️ Disappearing Platform
local part = script.Parent
local isFading = false

part.Touched:Connect(function(hit)
    local humanoid = hit.Parent:FindFirstChild("Humanoid")
    if humanoid and not isFading then
        isFading = true
        print("Stepped on platform! Fading out...")

        for i = 0, 10 do
            part.Transparency = i / 10
            task.wait(0.08)
        end

        part.CanCollide = false
        task.wait(2.5)

        part.CanCollide = true
        for i = 10, 0, -1 do
            part.Transparency = i / 10
            task.wait(0.04)
        end

        isFading = false
    end
end)
`,
  },
  {
    id: 'rainbow_disco',
    title: '🌈 Rainbow Neon Brick',
    category: 'Visuals',
    description: 'Smoothly cycles through all rainbow hues using Color3.fromHSV.',
    source: `-- 🌈 Rainbow Neon Brick
local part = script.Parent
part.Material = Enum.Material.Neon

local hue = 0
while true do
    hue = (hue + 0.01) % 1.0
    part.Color = Color3.fromHSV(hue, 1, 1)
    task.wait(0.03)
end
`,
  },
  {
    id: 'speed_boost_pad',
    title: '⚡ Speed Boost Pad',
    category: 'Mechanics',
    description: 'Temporarily triples player walk speed when touched.',
    source: `-- ⚡ Speed Boost Pad
local pad = script.Parent
local active = false

pad.Touched:Connect(function(hit)
    local humanoid = hit.Parent:FindFirstChild("Humanoid")
    if humanoid and not active then
        active = true
        local oldSpeed = humanoid.WalkSpeed
        humanoid.WalkSpeed = 48
        pad.Material = Enum.Material.Neon
        pad.Color = Color3.fromRGB(0, 255, 255)
        print("Super Speed Boost Activated!")

        task.wait(3.0)

        humanoid.WalkSpeed = oldSpeed
        pad.Material = Enum.Material.Plastic
        pad.Color = Color3.fromRGB(160, 165, 169)
        active = false
    end
end)
`,
  },
  {
    id: 'spawn_parts_debris',
    title: '📦 Dynamic Part Spawner & Debris',
    category: 'Mechanics',
    description: 'Spawns parts using Instance.new and cleans them up with Debris.',
    source: `-- 📦 Dynamic Part Spawner & Debris Service
local Debris = game:GetService("Debris")

print("Spawning 3 dynamic parts in Workspace...")

for i = 1, 3 do
    local part = Instance.new("Part")
    part.Name = "SpawnedPart_" .. i
    part.Size = Vector3.new(3, 3, 3)
    part.Position = Vector3.new(i * 5 - 10, 8, 0)
    part.Color = Color3.fromRGB(math.random(50, 255), math.random(50, 255), 255)
    part.Anchored = true
    part.Parent = workspace

    -- Automatically destroy after 6 seconds
    Debris:AddItem(part, 6)
    task.wait(0.5)
end
`,
  },
  {
    id: 'engine_test_suite',
    title: '🧪 Engine Test Suite (Tween, RunService, Signals)',
    category: 'Testing',
    description: 'Comprehensive test for GetService, TweenService, RunService, and ClickDetector.',
    source: `-- 🧪 Rovix Engine Test Suite
local part = script.Parent

local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")

print("=== SCRIPT TEST STARTED ===")
print("Script:", script.Name)
print("Parent:", part.Name)
print("Class:", part.ClassName)

part.Color = Color3.fromRGB(255, 0, 0)
part.Anchored = true

print("✓ Properties work")

part.Touched:Connect(function(hit)
    print("TOUCHED BY:", hit.Name)
end)

print("✓ Touched connection created")

local detector = part:FindFirstChildOfClass("ClickDetector")

if not detector then
    detector = Instance.new("ClickDetector")
    detector.MaxActivationDistance = 100
    detector.Parent = part
end

detector.MouseClick:Connect(function(player)
    print("CLICKED BY:", player.Name)
    part.Color = Color3.fromRGB(0, 255, 0)
end)

print("✓ ClickDetector connected")

task.spawn(function()
    while true do
        local tween1 = TweenService:Create(
            part,
            TweenInfo.new(
                1,
                Enum.EasingStyle.Sine,
                Enum.EasingDirection.InOut
            ),
            {
                Position = part.Position + Vector3.new(0, 5, 0),
                Color = Color3.fromRGB(0, 0, 255)
            }
        )

        tween1:Play()
        tween1.Completed:Wait()

        local tween2 = TweenService:Create(
            part,
            TweenInfo.new(
                1,
                Enum.EasingStyle.Sine,
                Enum.EasingDirection.InOut
            ),
            {
                Position = part.Position - Vector3.new(0, 5, 0),
                Color = Color3.fromRGB(255, 0, 0)
            }
        )

        tween2:Play()
        tween2.Completed:Wait()
    end
end)

print("✓ TweenService running")

local rotation = 0

RunService.Heartbeat:Connect(function(dt)
    rotation += math.rad(45) * dt
    part.CFrame = CFrame.new(part.Position) * CFrame.Angles(0, rotation, 0)
end)

print("✓ RunService connected")

task.spawn(function()
    for i = 1, 5 do
        print("Task test:", i)
        task.wait(0.5)
    end

    print("✓ task.wait works")
    print("=== SCRIPT TEST FINISHED ===")
end)
`,
  },
];

// Compatibility wrapper: LuaRuntime
export class LuaRuntime extends ModernLuauRuntime {
  constructor(opts: {
    parts: StudioPart[];
    threeMeshes?: Map<string, THREE.Mesh>;
    scene?: THREE.Scene | null;
    camera?: THREE.Camera | null;
    uiTree?: any[];
    onLog?: (log: OutputLogMessage) => void;
    onPlayerKilled?: () => void;
    onSpeedChanged?: (newSpeed: number) => void;
    onJumpPowerChanged?: (newPower: number) => void;
  }) {
    super(opts);
  }
}
