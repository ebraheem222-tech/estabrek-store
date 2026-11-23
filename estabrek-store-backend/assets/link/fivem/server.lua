-- Your site's link for FiveM: it talks to your site, your site never reaches into your server (no port to open,
-- no RCON password anywhere).
--   * Every minute it says hello (how many play) and learns whether your site's whitelist is on.
--   * While it is on, a player connecting is asked about on your site (their Discord, Steam and license), and
--     only those accepted come in, with your site's words for the others.
--   * /link 123456 links the player's game account to their account on your site (the code is on «حسابي»).
local VERSION = "1.0.0"
local whitelistOn = false

local WORDS = {
  ar = { checking = "عم نتأكد من الوايتلست…", away = "الموقع مش رادد هلّق. جرّب كمان شوي.", how = "اكتب /link والكود (6 أرقام) من «حسابي» بالموقع.", failed = "ما زبط. جرّب كمان مرة." },
  en = { checking = "Checking the whitelist…", away = "The site isn't answering right now. Try again in a moment.", how = "Type /link and the 6-digit code from «My account» on the site.", failed = "That didn't work. Try again." },
  he = { checking = "בודקים את הרשימה הלבנה…", away = "האתר לא עונה כרגע. נסו שוב עוד רגע.", how = "הקלידו /link ואת הקוד (6 ספרות) מ«החשבון שלי» באתר.", failed = "זה לא הצליח. נסו שוב." },
}
local function word(key)
  local w = WORDS[Config.Lang] or WORDS.ar
  return w[key]
end

-- One call to the site: a JSON body, the server's key, and the answer (nil when the site didn't answer).
local function call(path, body, done)
  PerformHttpRequest(Config.Api .. path, function(status, text)
    local data = nil
    if text and #text > 0 then
      local ok, decoded = pcall(json.decode, text)
      if ok then data = decoded end
    end
    done(status, data)
  end, "POST", json.encode(body or {}), { ["Content-Type"] = "application/json", ["Authorization"] = "Bearer " .. Config.Key })
end

-- A player's identifiers by their kind: license, discord, steam (the part after "kind:").
local function identifiersOf(src)
  local ids = {}
  for _, id in ipairs(GetPlayerIdentifiers(src)) do
    local kind, value = id:match("^(%w+):(.+)$")
    if kind and value then ids[kind] = value end
  end
  return ids
end

-- Hello every minute: how many play; the site says whether its whitelist is on.
CreateThread(function()
  while true do
    call("/hello", { game = "fivem", version = VERSION, players = #GetPlayers(), lang = Config.Lang }, function(status, data)
      if status == 200 and data then whitelistOn = data.whitelist == true end
    end)
    Wait(60000)
  end
end)

-- The whitelist: asked of the site as a player connects (FiveM's deferrals hold them meanwhile).
AddEventHandler("playerConnecting", function(name, setKickReason, deferrals)
  if not whitelistOn then return end
  local src = source
  deferrals.defer()
  Wait(0)
  deferrals.update(word("checking"))
  local ids = identifiersOf(src)
  local answered = false
  call("/whitelist", { name = name, lang = Config.Lang, ids = { license = ids.license, discord = ids.discord, steam = ids.steam } }, function(status, data)
    answered = true
    if status == 200 and data and data.allowed == true then
      deferrals.done()
    elseif status == 200 and data and data.allowed == false then
      deferrals.done(data.message or word("away"))
    else
      -- The site didn't answer while the whitelist is on: nobody unknown comes in.
      deferrals.done(word("away"))
    end
  end)
  local waited = 0
  while not answered and waited < 150 do
    Wait(100)
    waited = waited + 1
  end
  if not answered then deferrals.done(word("away")) end
end)

-- /link 123456: the code from «حسابي» on the site links this game account to that site account.
RegisterCommand("link", function(src, args)
  if src == 0 then return end
  local code = args[1]
  local say = function(text) TriggerClientEvent("chat:addMessage", src, { args = { Config.Name, text } }) end
  if not code or not code:match("^%d%d%d%d%d%d$") then return say(word("how")) end
  local ids = identifiersOf(src)
  call("/claim", { code = code, game = "fivem", lang = Config.Lang, account = { id = ids.license, name = GetPlayerName(src) } }, function(status, data)
    say((data and data.message) or word("failed"))
  end)
end, false)
