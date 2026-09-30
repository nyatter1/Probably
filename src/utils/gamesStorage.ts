import { db, collection, doc, setDoc, deleteDoc, onSnapshot } from './firebase.ts';

export interface StudioScript {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  parentPartId?: string | null;
}

export interface StudioPart {
  id: string;
  name: string;
  shape: 'block' | 'sphere' | 'cylinder' | 'wedge';
  position: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number]; // in degrees
  color: string;
  material: 'Plastic' | 'Neon' | 'Wood' | 'SmoothPlastic';
  transparency: number;
  anchored: boolean;
  canCollide: boolean;
  script?: StudioScript;
  hasClickDetector?: boolean;
  folder?: string;
}

export interface SavedGame {
  id: string;
  title: string;
  creator: string;
  creatorId?: string;
  initials: string;
  iconUrl?: string;
  gradient: string;
  isPublic: boolean;
  parts: StudioPart[];
  scripts?: StudioScript[];
  uiTree?: any[];
  updatedAt: number;
  createdAt?: number;
  description?: string;
  playingCount?: number;
}

const STORAGE_KEY_GAMES = 'rovix_saved_games_v2';

const memoryGamesStore = new Map<string, string>();
const safeGameStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return memoryGamesStore.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {}
    memoryGamesStore.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    memoryGamesStore.delete(key);
  },
};

export const CLICKER_UI_SCRIPT = `-- ✨ Pure UI Clicker Game (All-in-One Experience)
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local player = Players.LocalPlayer

print("=========================================")
print("✨ CLICKER GAME (PURE UI EXPERIENCE) LOADED! ✨")
print("=========================================")

-- State Variables
local clicks = 0
local clickPower = 1
local autoClickers = 0
local megaClickers = 0
local rebirths = 0
local multiplier = 1

-- Upgrades Cost
local cost1 = 15
local cost2 = 50
local cost3 = 250
local costRebirth = 1000

-- Wait for UI hierarchy
local playerGui = player:WaitForChild("PlayerGui")
local screenGui = playerGui:WaitForChild("ClickerGui")
local mainFrame = screenGui:WaitForChild("MainFrame")

local topBar = mainFrame:WaitForChild("TopBar")
local clicksLabel = topBar:WaitForChild("ClicksLabel")
local statsLabel = topBar:WaitForChild("StatsLabel")

local centerArea = mainFrame:WaitForChild("CenterArea")
local clickButton = centerArea:WaitForChild("ClickButton")

local shopFrame = mainFrame:WaitForChild("ShopFrame")
local shopList = shopFrame:WaitForChild("ShopList")

local upgrade1Btn = shopList:WaitForChild("Upgrade1")
local upgrade2Btn = shopList:WaitForChild("Upgrade2")
local upgrade3Btn = shopList:WaitForChild("Upgrade3")
local rebirthBtn = shopList:WaitForChild("RebirthBtn")

local function formatNumber(n)
    if n >= 1000000 then
        return string.format("%.1fM", n / 1000000)
    elseif n >= 1000 then
        return string.format("%.1fK", n / 1000)
    else
        return tostring(n)
    end
end

local function updateDisplay()
    local totalCps = (autoClickers * 1 + megaClickers * 10) * multiplier
    clicksLabel.Text = "💰 " .. formatNumber(clicks) .. " Clicks"
    statsLabel.Text = "👆 +" .. formatNumber(clickPower * multiplier) .. "/click  •  🤖 " .. formatNumber(totalCps) .. " CPS  •  🌟 " .. rebirths .. " Rebirths (" .. multiplier .. "x)"
    
    upgrade1Btn.Text = "👆 Power Click (+1)\\nCost: " .. formatNumber(cost1) .. " Clicks"
    upgrade2Btn.Text = "🤖 Auto Clicker (+1 CPS)\\nCost: " .. formatNumber(cost2) .. " Clicks"
    upgrade3Btn.Text = "⚡ Turbo Clicker (+10 CPS)\\nCost: " .. formatNumber(cost3) .. " Clicks"
    rebirthBtn.Text = "🌟 REBIRTH (+100% Multiplier)\\nCost: " .. formatNumber(costRebirth) .. " Clicks"
end

-- Floating +Click text animation
local function spawnFloatingText(amount)
    local floatLabel = Instance.new("TextLabel")
    floatLabel.Name = "FloatText"
    floatLabel.Size = UDim2.new(0, 100, 0, 30)
    
    local randX = math.random(30, 70) / 100
    local randY = math.random(40, 55) / 100
    floatLabel.Position = UDim2.new(randX, 0, randY, 0)
    floatLabel.AnchorPoint = { X = 0.5, Y = 0.5 }
    floatLabel.BackgroundTransparency = 1
    floatLabel.Text = "+" .. formatNumber(amount)
    floatLabel.TextColor3 = Color3.fromRGB(255, 230, 0)
    floatLabel.TextSize = 22
    floatLabel.Font = Enum.Font.GothamBold
    floatLabel.ZIndex = 20
    floatLabel.Parent = centerArea

    task.spawn(function()
        local floatTween = TweenService:Create(
            floatLabel,
            TweenInfo.new(0.7, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
            {
                Position = floatLabel.Position - UDim2.new(0, 0, 0, 50),
                TextTransparency = 1
            }
        )
        floatTween:Play()
        floatTween.Completed:Wait()
        floatLabel:Destroy()
    end)
end

-- Click Button
clickButton.MouseButton1Click:Connect(function()
    local gain = clickPower * multiplier
    clicks = clicks + gain
    spawnFloatingText(gain)
    updateDisplay()

    -- Button bounce animation
    task.spawn(function()
        local pressTween = TweenService:Create(
            clickButton,
            TweenInfo.new(0.05, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
            { Size = UDim2.new(0, 190, 0, 190) }
        )
        pressTween:Play()
        pressTween.Completed:Wait()

        local releaseTween = TweenService:Create(
            clickButton,
            TweenInfo.new(0.12, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
            { Size = UDim2.new(0, 210, 0, 210) }
        )
        releaseTween:Play()
    end)
end)

-- Upgrade 1
upgrade1Btn.MouseButton1Click:Connect(function()
    if clicks >= cost1 then
        clicks = clicks - cost1
        clickPower = clickPower + 1
        cost1 = math.floor(cost1 * 1.5)
        print("Purchased Power Click! Power: " .. clickPower)
        updateDisplay()
    else
        print("Not enough clicks! Need " .. cost1)
    end
end)

-- Upgrade 2
upgrade2Btn.MouseButton1Click:Connect(function()
    if clicks >= cost2 then
        clicks = clicks - cost2
        autoClickers = autoClickers + 1
        cost2 = math.floor(cost2 * 1.6)
        print("Purchased Auto Clicker! Count: " .. autoClickers)
        updateDisplay()
    else
        print("Not enough clicks! Need " .. cost2)
    end
end)

-- Upgrade 3
upgrade3Btn.MouseButton1Click:Connect(function()
    if clicks >= cost3 then
        clicks = clicks - cost3
        megaClickers = megaClickers + 1
        cost3 = math.floor(cost3 * 1.7)
        print("Purchased Turbo Clicker! Count: " .. megaClickers)
        updateDisplay()
    else
        print("Not enough clicks! Need " .. cost3)
    end
end)

-- Rebirth
rebirthBtn.MouseButton1Click:Connect(function()
    if clicks >= costRebirth then
        rebirths = rebirths + 1
        multiplier = multiplier + 1
        clicks = 0
        clickPower = 1
        autoClickers = 0
        megaClickers = 0
        cost1 = 15
        cost2 = 50
        cost3 = 250
        costRebirth = math.floor(costRebirth * 2.5)
        print("🎉 REBIRTH SUCCESSFUL! Multiplier: " .. multiplier .. "x!")
        updateDisplay()
    else
        print("Not enough clicks for Rebirth! Need " .. costRebirth)
    end
end)

-- Auto Clicker Background Loop
task.spawn(function()
    while true do
        task.wait(1.0)
        local totalCps = (autoClickers * 1 + megaClickers * 10) * multiplier
        if totalCps > 0 then
            clicks = clicks + totalCps
            updateDisplay()
        end
    end
end)

-- Initial UI Setup
updateDisplay()
`;

export const CLICKER_GAME_PLACE: SavedGame = {
  id: 'clicker',
  title: 'Clicker',
  creator: 'Test123',
  initials: 'CK',
  gradient: 'from-[#1e1b4b] via-[#31104b] to-[#0f172a]',
  isPublic: true,
  updatedAt: Date.now(),
  parts: [
    {
      id: 'spawn_platform',
      name: 'Spawn Baseplate',
      shape: 'block',
      position: [0, 0, 0],
      size: [24, 1, 24],
      rotation: [0, 0, 0],
      color: '#1e2029',
      material: 'SmoothPlastic',
      transparency: 0,
      anchored: true,
      canCollide: true,
    },
  ],
  uiTree: [
    {
      id: 'gui_clicker',
      className: 'ScreenGui',
      name: 'ClickerGui',
      properties: {
        Enabled: true,
        DisplayOrder: 10,
      },
      children: [
        {
          id: 'frame_main',
          className: 'Frame',
          name: 'MainFrame',
          properties: {
            Position: { _type: 'UDim2', xScale: 0.5, xOffset: 0, yScale: 0.5, yOffset: 0 },
            Size: { _type: 'UDim2', xScale: 0, xOffset: 680, yScale: 0, yOffset: 480 },
            AnchorPoint: { X: 0.5, Y: 0.5 },
            BackgroundColor3: { _type: 'Color3', hex: '#12151c' },
            BackgroundTransparency: 0.05,
            BorderSizePixel: 0,
            Visible: true,
          },
          children: [
            {
              id: 'corner_main',
              className: 'UICorner',
              name: 'UICorner',
              properties: {
                CornerRadius: { _type: 'UDim', scale: 0, offset: 16 },
              },
            },
            {
              id: 'stroke_main',
              className: 'UIStroke',
              name: 'UIStroke',
              properties: {
                Color: { _type: 'Color3', hex: '#3b82f6' },
                Thickness: 2,
                Transparency: 0.1,
              },
            },
            // Top Bar
            {
              id: 'frame_topbar',
              className: 'Frame',
              name: 'TopBar',
              properties: {
                Position: { _type: 'UDim2', xScale: 0.5, xOffset: 0, yScale: 0, yOffset: 16 },
                Size: { _type: 'UDim2', xScale: 1, xOffset: -32, yScale: 0, yOffset: 96 },
                AnchorPoint: { X: 0.5, Y: 0 },
                BackgroundColor3: { _type: 'Color3', hex: '#1a1e28' },
                BackgroundTransparency: 0.4,
                BorderSizePixel: 0,
              },
              children: [
                {
                  id: 'corner_topbar',
                  className: 'UICorner',
                  name: 'UICorner',
                  properties: {
                    CornerRadius: { _type: 'UDim', scale: 0, offset: 12 },
                  },
                },
                {
                  id: 'stroke_topbar',
                  className: 'UIStroke',
                  name: 'UIStroke',
                  properties: {
                    Color: { _type: 'Color3', hex: '#2563eb' },
                    Thickness: 1,
                  },
                },
                {
                  id: 'lbl_title',
                  className: 'TextLabel',
                  name: 'TitleLabel',
                  properties: {
                    Position: { _type: 'UDim2', xScale: 0.5, xOffset: 0, yScale: 0, yOffset: 6 },
                    Size: { _type: 'UDim2', xScale: 1, xOffset: 0, yScale: 0, yOffset: 20 },
                    AnchorPoint: { X: 0.5, Y: 0 },
                    BackgroundTransparency: 1,
                    Text: '✨ CLICKER SIMULATOR ✨',
                    TextColor3: { _type: 'Color3', hex: '#60a5fa' },
                    TextSize: 13,
                    Font: 'GothamBold',
                  },
                },
                {
                  id: 'lbl_clicks',
                  className: 'TextLabel',
                  name: 'ClicksLabel',
                  properties: {
                    Position: { _type: 'UDim2', xScale: 0.5, xOffset: 0, yScale: 0, yOffset: 26 },
                    Size: { _type: 'UDim2', xScale: 1, xOffset: 0, yScale: 0, yOffset: 44 },
                    AnchorPoint: { X: 0.5, Y: 0 },
                    BackgroundTransparency: 1,
                    Text: '💰 0 Clicks',
                    TextColor3: { _type: 'Color3', hex: '#facc15' },
                    TextSize: 32,
                    Font: 'GothamBlack',
                  },
                },
                {
                  id: 'lbl_stats',
                  className: 'TextLabel',
                  name: 'StatsLabel',
                  properties: {
                    Position: { _type: 'UDim2', xScale: 0.5, xOffset: 0, yScale: 0, yOffset: 70 },
                    Size: { _type: 'UDim2', xScale: 1, xOffset: 0, yScale: 0, yOffset: 20 },
                    AnchorPoint: { X: 0.5, Y: 0 },
                    BackgroundTransparency: 1,
                    Text: '👆 +1/click  •  🤖 0 CPS  •  🌟 0 Rebirths (1x)',
                    TextColor3: { _type: 'Color3', hex: '#94a3b8' },
                    TextSize: 12,
                    Font: 'GothamMedium',
                  },
                },
              ],
            },
            // Center Click Area
            {
              id: 'frame_center',
              className: 'Frame',
              name: 'CenterArea',
              properties: {
                Position: { _type: 'UDim2', xScale: 0, xOffset: 16, yScale: 0, yOffset: 124 },
                Size: { _type: 'UDim2', xScale: 0, xOffset: 300, yScale: 0, yOffset: 340 },
                BackgroundColor3: { _type: 'Color3', hex: '#181b24' },
                BackgroundTransparency: 0.3,
                BorderSizePixel: 0,
              },
              children: [
                {
                  id: 'corner_center',
                  className: 'UICorner',
                  name: 'UICorner',
                  properties: {
                    CornerRadius: { _type: 'UDim', scale: 0, offset: 12 },
                  },
                },
                {
                  id: 'stroke_center',
                  className: 'UIStroke',
                  name: 'UIStroke',
                  properties: {
                    Color: { _type: 'Color3', hex: '#334155' },
                    Thickness: 1,
                  },
                },
                {
                  id: 'btn_click',
                  className: 'TextButton',
                  name: 'ClickButton',
                  properties: {
                    Position: { _type: 'UDim2', xScale: 0.5, xOffset: 0, yScale: 0.5, yOffset: 0 },
                    Size: { _type: 'UDim2', xScale: 0, xOffset: 210, yScale: 0, yOffset: 210 },
                    AnchorPoint: { X: 0.5, Y: 0.5 },
                    BackgroundColor3: { _type: 'Color3', hex: '#dc2626' },
                    BackgroundTransparency: 0,
                    Text: '👆\nCLICK!',
                    TextColor3: { _type: 'Color3', hex: '#ffffff' },
                    TextSize: 32,
                    Font: 'GothamBlack',
                  },
                  children: [
                    {
                      id: 'corner_clickbtn',
                      className: 'UICorner',
                      name: 'UICorner',
                      properties: {
                        CornerRadius: { _type: 'UDim', scale: 0, offset: 105 },
                      },
                    },
                    {
                      id: 'stroke_clickbtn',
                      className: 'UIStroke',
                      name: 'UIStroke',
                      properties: {
                        Color: { _type: 'Color3', hex: '#f87171' },
                        Thickness: 4,
                      },
                    },
                  ],
                },
              ],
            },
            // Shop Upgrades Frame
            {
              id: 'frame_shop',
              className: 'Frame',
              name: 'ShopFrame',
              properties: {
                Position: { _type: 'UDim2', xScale: 0, xOffset: 330, yScale: 0, yOffset: 124 },
                Size: { _type: 'UDim2', xScale: 0, xOffset: 334, yScale: 0, yOffset: 340 },
                BackgroundColor3: { _type: 'Color3', hex: '#181b24' },
                BackgroundTransparency: 0.3,
                BorderSizePixel: 0,
              },
              children: [
                {
                  id: 'corner_shop',
                  className: 'UICorner',
                  name: 'UICorner',
                  properties: {
                    CornerRadius: { _type: 'UDim', scale: 0, offset: 12 },
                  },
                },
                {
                  id: 'stroke_shop',
                  className: 'UIStroke',
                  name: 'UIStroke',
                  properties: {
                    Color: { _type: 'Color3', hex: '#334155' },
                    Thickness: 1,
                  },
                },
                {
                  id: 'lbl_shoptitle',
                  className: 'TextLabel',
                  name: 'ShopTitle',
                  properties: {
                    Position: { _type: 'UDim2', xScale: 0.5, xOffset: 0, yScale: 0, yOffset: 10 },
                    Size: { _type: 'UDim2', xScale: 1, xOffset: 0, yScale: 0, yOffset: 20 },
                    AnchorPoint: { X: 0.5, Y: 0 },
                    BackgroundTransparency: 1,
                    Text: '🛒 UPGRADES SHOP',
                    TextColor3: { _type: 'Color3', hex: '#38bdf8' },
                    TextSize: 13,
                    Font: 'GothamBold',
                  },
                },
                {
                  id: 'frame_shoplist',
                  className: 'Frame',
                  name: 'ShopList',
                  properties: {
                    Position: { _type: 'UDim2', xScale: 0.5, xOffset: 0, yScale: 0, yOffset: 38 },
                    Size: { _type: 'UDim2', xScale: 1, xOffset: -20, yScale: 0, yOffset: 290 },
                    AnchorPoint: { X: 0.5, Y: 0 },
                    BackgroundTransparency: 1,
                  },
                  children: [
                    {
                      id: 'layout_shoplist',
                      className: 'UIListLayout',
                      name: 'UIListLayout',
                      properties: {
                        FillDirection: 'Vertical',
                        Padding: { _type: 'UDim', scale: 0, offset: 8 },
                      },
                    },
                    {
                      id: 'btn_upg1',
                      className: 'TextButton',
                      name: 'Upgrade1',
                      properties: {
                        Size: { _type: 'UDim2', xScale: 1, xOffset: 0, yScale: 0, yOffset: 62 },
                        BackgroundColor3: { _type: 'Color3', hex: '#1e293b' },
                        Text: '👆 Power Click (+1)\nCost: 15 Clicks',
                        TextColor3: { _type: 'Color3', hex: '#f1f5f9' },
                        TextSize: 12,
                        Font: 'GothamBold',
                      },
                      children: [
                        {
                          id: 'corner_upg1',
                          className: 'UICorner',
                          name: 'UICorner',
                          properties: {
                            CornerRadius: { _type: 'UDim', scale: 0, offset: 8 },
                          },
                        },
                        {
                          id: 'stroke_upg1',
                          className: 'UIStroke',
                          name: 'UIStroke',
                          properties: {
                            Color: { _type: 'Color3', hex: '#3b82f6' },
                            Thickness: 1,
                          },
                        },
                      ],
                    },
                    {
                      id: 'btn_upg2',
                      className: 'TextButton',
                      name: 'Upgrade2',
                      properties: {
                        Size: { _type: 'UDim2', xScale: 1, xOffset: 0, yScale: 0, yOffset: 62 },
                        BackgroundColor3: { _type: 'Color3', hex: '#1e293b' },
                        Text: '🤖 Auto Clicker (+1 CPS)\nCost: 50 Clicks',
                        TextColor3: { _type: 'Color3', hex: '#f1f5f9' },
                        TextSize: 12,
                        Font: 'GothamBold',
                      },
                      children: [
                        {
                          id: 'corner_upg2',
                          className: 'UICorner',
                          name: 'UICorner',
                          properties: {
                            CornerRadius: { _type: 'UDim', scale: 0, offset: 8 },
                          },
                        },
                        {
                          id: 'stroke_upg2',
                          className: 'UIStroke',
                          name: 'UIStroke',
                          properties: {
                            Color: { _type: 'Color3', hex: '#10b981' },
                            Thickness: 1,
                          },
                        },
                      ],
                    },
                    {
                      id: 'btn_upg3',
                      className: 'TextButton',
                      name: 'Upgrade3',
                      properties: {
                        Size: { _type: 'UDim2', xScale: 1, xOffset: 0, yScale: 0, yOffset: 62 },
                        BackgroundColor3: { _type: 'Color3', hex: '#1e293b' },
                        Text: '⚡ Turbo Clicker (+10 CPS)\nCost: 250 Clicks',
                        TextColor3: { _type: 'Color3', hex: '#f1f5f9' },
                        TextSize: 12,
                        Font: 'GothamBold',
                      },
                      children: [
                        {
                          id: 'corner_upg3',
                          className: 'UICorner',
                          name: 'UICorner',
                          properties: {
                            CornerRadius: { _type: 'UDim', scale: 0, offset: 8 },
                          },
                        },
                        {
                          id: 'stroke_upg3',
                          className: 'UIStroke',
                          name: 'UIStroke',
                          properties: {
                            Color: { _type: 'Color3', hex: '#f59e0b' },
                            Thickness: 1,
                          },
                        },
                      ],
                    },
                    {
                      id: 'btn_rebirth',
                      className: 'TextButton',
                      name: 'RebirthBtn',
                      properties: {
                        Size: { _type: 'UDim2', xScale: 1, xOffset: 0, yScale: 0, yOffset: 62 },
                        BackgroundColor3: { _type: 'Color3', hex: '#4c1d95' },
                        Text: '🌟 REBIRTH (+100% Multiplier)\nCost: 1,000 Clicks',
                        TextColor3: { _type: 'Color3', hex: '#fdf4ff' },
                        TextSize: 12,
                        Font: 'GothamBold',
                      },
                      children: [
                        {
                          id: 'corner_rebirth',
                          className: 'UICorner',
                          name: 'UICorner',
                          properties: {
                            CornerRadius: { _type: 'UDim', scale: 0, offset: 8 },
                          },
                        },
                        {
                          id: 'stroke_rebirth',
                          className: 'UIStroke',
                          name: 'UIStroke',
                          properties: {
                            Color: { _type: 'Color3', hex: '#ec4899' },
                            Thickness: 1.5,
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        // Script instance attached to ClickerGui
        {
          id: 'script_clicker_engine',
          className: 'LocalScript',
          name: 'ClickerEngine',
          properties: {
            Enabled: true,
            Source: CLICKER_UI_SCRIPT,
          },
        },
      ],
    },
  ],
};

export const CLICK_THE_BUTTON_SCRIPT = `-- 🔴 Click the button [BETA]
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

    -- Update ScreenGui Counter in PlayerGui if present
    if player and typeof(player) == "table" and player.PlayerGui then
        local hud = player.PlayerGui:FindFirstChild("ClickerHUD")
        if hud then
            local counterFrame = hud:FindFirstChild("CounterFrame")
            if counterFrame and counterFrame:FindFirstChild("CounterLabel") then
                counterFrame.CounterLabel.Text = "Clicks: " .. clicks
            end
        end
    end

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
`;

export const CLICK_THE_BUTTON_PLACE: SavedGame = {
  id: 'click_the_button',
  title: 'Button RNG',
  creator: '@Fizzy_cookieboy233',
  initials: 'BR',
  iconUrl: '/presets/button_rng_thumb.jpg',
  gradient: 'from-[#b91c1c] via-[#7f1d1d] to-[#450a0a]',
  isPublic: true,
  description: 'Welcome to Button RNG! Press the rainbow button to generate cash and unlock higher tiers. Can you reach $1.8QT?',
  playingCount: 0,
  updatedAt: Date.now(),
  parts: [
    {
      id: 'podium_base',
      name: 'Podium Base',
      shape: 'block',
      position: [0, 0.5, 0],
      size: [8, 1, 8],
      rotation: [0, 0, 0],
      color: '#1f242d',
      material: 'SmoothPlastic',
      transparency: 0,
      anchored: true,
      canCollide: true,
    },
    {
      id: 'pedestal_pillar',
      name: 'Pedestal Pillar',
      shape: 'cylinder',
      position: [0, 2.0, 0],
      size: [4.5, 2.5, 4.5],
      rotation: [0, 0, 0],
      color: '#2e3440',
      material: 'Plastic',
      transparency: 0,
      anchored: true,
      canCollide: true,
    },
    {
      id: 'pedestal_ring',
      name: 'Golden Ring',
      shape: 'cylinder',
      position: [0, 3.3, 0],
      size: [4, 0.3, 4],
      rotation: [0, 0, 0],
      color: '#d4af37',
      material: 'Neon',
      transparency: 0,
      anchored: true,
      canCollide: true,
    },
    {
      id: 'big_red_button',
      name: 'Big Red Button',
      shape: 'cylinder',
      position: [0, 3.8, 0],
      size: [3.2, 0.7, 3.2],
      rotation: [0, 0, 0],
      color: '#ff1e1e',
      material: 'Plastic',
      transparency: 0,
      anchored: true,
      canCollide: true,
      hasClickDetector: true,
      script: {
        id: 'script_button_counter',
        name: 'ClickCounterScript',
        code: CLICK_THE_BUTTON_SCRIPT,
        enabled: true,
        parentPartId: 'big_red_button',
      },
    },
    {
      id: 'display_backboard',
      name: 'Display Backboard',
      shape: 'block',
      position: [0, 9.5, -4.5],
      size: [12, 5.2, 0.6],
      rotation: [0, 0, 0],
      color: '#111317',
      material: 'SmoothPlastic',
      transparency: 0,
      anchored: true,
      canCollide: true,
    },
    {
      id: 'display_border',
      name: 'Neon Border',
      shape: 'block',
      position: [0, 9.5, -4.6],
      size: [12.6, 5.8, 0.3],
      rotation: [0, 0, 0],
      color: '#00e5ff',
      material: 'Neon',
      transparency: 0,
      anchored: true,
      canCollide: false,
    },
    {
      id: 'sign_title',
      name: 'CLICKS Title Bar',
      shape: 'block',
      position: [0, 12.8, -4.5],
      size: [9, 0.9, 0.5],
      rotation: [0, 0, 0],
      color: '#ff0055',
      material: 'Neon',
      transparency: 0,
      anchored: true,
      canCollide: false,
    },
    {
      id: 'left_neon_pillar',
      name: 'Left Neon Column',
      shape: 'cylinder',
      position: [-6.8, 6.0, -4.5],
      size: [1.2, 12, 1.2],
      rotation: [0, 0, 0],
      color: '#00e5ff',
      material: 'Neon',
      transparency: 0,
      anchored: true,
      canCollide: true,
    },
    {
      id: 'right_neon_pillar',
      name: 'Right Neon Column',
      shape: 'cylinder',
      position: [6.8, 6.0, -4.5],
      size: [1.2, 12, 1.2],
      rotation: [0, 0, 0],
      color: '#00e5ff',
      material: 'Neon',
      transparency: 0,
      anchored: true,
      canCollide: true,
    },
    {
      id: 'spawn_platform',
      name: 'Spawn Platform',
      shape: 'block',
      position: [0, 0.2, 7],
      size: [6, 0.4, 6],
      rotation: [0, 0, 0],
      color: '#3b4252',
      material: 'SmoothPlastic',
      transparency: 0,
      anchored: true,
      canCollide: true,
    },
  ],
  uiTree: [
    {
      id: 'gui_clicker_hud',
      className: 'ScreenGui',
      name: 'ClickerHUD',
      properties: {
        Enabled: true,
        DisplayOrder: 1,
      },
      children: [
        {
          id: 'frame_counter_hud',
          className: 'Frame',
          name: 'CounterFrame',
          properties: {
            Position: { _type: 'UDim2', xScale: 0.5, xOffset: 0, yScale: 0.08, yOffset: 0 },
            Size: { _type: 'UDim2', xScale: 0, xOffset: 260, yScale: 0, yOffset: 84 },
            AnchorPoint: { X: 0.5, Y: 0 },
            BackgroundColor3: { _type: 'Color3', hex: '#16191f' },
            BackgroundTransparency: 0.2,
            BorderSizePixel: 0,
            Visible: true,
          },
          children: [
            {
              id: 'corner_counter_hud',
              className: 'UICorner',
              name: 'UICorner',
              properties: {
                CornerRadius: { _type: 'UDim', scale: 0, offset: 12 },
              },
            },
            {
              id: 'stroke_counter_hud',
              className: 'UIStroke',
              name: 'UIStroke',
              properties: {
                Color: { _type: 'Color3', hex: '#ff3344' },
                Thickness: 2,
                Transparency: 0.1,
              },
            },
            {
              id: 'label_title_hud',
              className: 'TextLabel',
              name: 'TitleLabel',
              properties: {
                Position: { _type: 'UDim2', xScale: 0, xOffset: 0, yScale: 0, yOffset: 8 },
                Size: { _type: 'UDim2', xScale: 1, xOffset: 0, yScale: 0, yOffset: 24 },
                BackgroundTransparency: 1,
                Text: '🔴 CLICK THE BUTTON [BETA]',
                TextColor3: { _type: 'Color3', hex: '#ff4455' },
                TextSize: 14,
                Font: 'GothamBold',
                TextXAlignment: 'Center',
                TextYAlignment: 'Center',
              },
            },
            {
              id: 'label_count_hud',
              className: 'TextLabel',
              name: 'CounterLabel',
              properties: {
                Position: { _type: 'UDim2', xScale: 0, xOffset: 0, yScale: 0, yOffset: 34 },
                Size: { _type: 'UDim2', xScale: 1, xOffset: 0, yScale: 0, yOffset: 42 },
                BackgroundTransparency: 1,
                Text: 'Clicks: 0',
                TextColor3: { _type: 'Color3', hex: '#ffffff' },
                TextSize: 28,
                Font: 'GothamBlack',
                TextXAlignment: 'Center',
                TextYAlignment: 'Center',
              },
            },
          ],
        },
      ],
    },
  ],
};

export const DEFAULT_TEST_PLACE: SavedGame = {
  id: 'test_place',
  title: 'Test Place',
  creator: 'Test123',
  initials: 'TP',
  gradient: 'from-[#2e623a] via-[#1a3821] to-[#0f2013]',
  isPublic: true,
  updatedAt: Date.now(),
  parts: [
    {
      id: 'brick_red',
      name: 'Red Brick',
      shape: 'block',
      position: [16, 1.5, 12],
      size: [6, 3, 6],
      rotation: [0, 0, 0],
      color: '#c4281b',
      material: 'Plastic',
      transparency: 0,
      anchored: true,
      canCollide: true,
    },
    {
      id: 'tower_blue',
      name: 'Blue Tower',
      shape: 'block',
      position: [24, 3.0, 16],
      size: [6, 6, 6],
      rotation: [0, 0, 0],
      color: '#0d69ac',
      material: 'Plastic',
      transparency: 0,
      anchored: true,
      canCollide: true,
    },
    {
      id: 'plat_yellow',
      name: 'Yellow Platform',
      shape: 'block',
      position: [33, 4.5, 22],
      size: [8, 9, 8],
      rotation: [0, 0, 0],
      color: '#f5cd2f',
      material: 'Plastic',
      transparency: 0,
      anchored: true,
      canCollide: true,
    },
    {
      id: 'neon_pillar',
      name: 'Neon Pillar',
      shape: 'cylinder',
      position: [-10, 4.0, -10],
      size: [4, 8, 4],
      rotation: [0, 0, 0],
      color: '#00ffff',
      material: 'Neon',
      transparency: 0,
      anchored: true,
      canCollide: true,
    },
    {
      id: 'ghost_wall',
      name: 'Ghost Barrier',
      shape: 'block',
      position: [0, 3.0, -14],
      size: [10, 6, 1.5],
      rotation: [0, 0, 0],
      color: '#a855f7',
      material: 'Neon',
      transparency: 0.5,
      anchored: true,
      canCollide: false,
    },
  ],
};

let cachedLiveGames: SavedGame[] = [];

export function subscribeToLiveGames(callback: (games: SavedGame[]) => void): () => void {
  if (!db) {
    callback(getSavedGames());
    return () => {};
  }

  const colRef = collection(db, 'published_games');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: SavedGame[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SavedGame;
        if (data && data.id) {
          list.push(data);
        }
      });

      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      cachedLiveGames = list;
      saveGamesListToLocalStorage(list);
      callback(list);
    },
    (err) => {
      console.warn('Live games sync notice:', err);
      callback(getSavedGames());
    }
  );
}

export function getSavedGames(): SavedGame[] {
  if (cachedLiveGames.length > 0) {
    return cachedLiveGames;
  }
  try {
    const raw = safeGameStorage.getItem(STORAGE_KEY_GAMES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load games from localStorage:', e);
  }
  return [];
}

function saveGamesListToLocalStorage(games: SavedGame[]): void {
  try {
    safeGameStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
  } catch (e) {
    console.error('Failed to save games list to localStorage:', e);
  }
}

export function saveGamesList(games: SavedGame[]): void {
  saveGamesListToLocalStorage(games);
}

export function getGameById(id: string): SavedGame | undefined {
  const games = getSavedGames();
  return games.find((g) => g.id === id);
}

export function saveGame(game: SavedGame): SavedGame {
  const games = getSavedGames();
  const existingIndex = games.findIndex((g) => g.id === game.id);

  const updatedGame: SavedGame = {
    ...game,
    updatedAt: Date.now(),
  };

  if (existingIndex >= 0) {
    games[existingIndex] = updatedGame;
  } else {
    games.unshift(updatedGame);
  }

  saveGamesListToLocalStorage(games);

  // Sync Live to Firebase Firestore so ALL users see it on their site!
  if (db) {
    try {
      setDoc(doc(db, 'published_games', game.id), updatedGame, { merge: true });
    } catch (e) {
      console.error('Error publishing game to Firestore:', e);
    }
  }

  return updatedGame;
}

export function deleteGame(id: string): void {
  const games = getSavedGames().filter((g) => g.id !== id);
  saveGamesListToLocalStorage(games);

  if (db) {
    try {
      deleteDoc(doc(db, 'published_games', id));
    } catch (e) {
      console.error('Error deleting game from Firestore:', e);
    }
  }
}

export function toggleGamePublic(id: string, isPublic: boolean): void {
  const games = getSavedGames();
  const game = games.find((g) => g.id === id);
  if (game) {
    game.isPublic = isPublic;
    game.updatedAt = Date.now();
    saveGame(game);
  }
}

export function updateGameIcon(id: string, iconUrl: string): void {
  const games = getSavedGames();
  const game = games.find((g) => g.id === id);
  if (game) {
    game.iconUrl = iconUrl;
    game.updatedAt = Date.now();
    saveGame(game);
  }
}
