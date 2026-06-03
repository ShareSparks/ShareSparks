---
title: "无状态的模型,有记忆的 Agent"
publishDate: 2026-06-03
author: liu
description: "以 Claude Code 及其 Agent SDK 源码为样本,讲清楚从按下回车到拿到回复之间的请求流程、缓存与上下文压缩。"
tags: [Agent, Claude Code, LLM]
---

### —— Claude Code 是怎么完成你的任务的:请求流程、缓存与压缩全解析

## 写在前面

从去年底到现在,Claude Code、Codex 这类命令行 AI 编程助手火得很快。它们用起来像个"懂你项目的同事",但很少有人说得清:**按下回车到拿到回复之间,你的电脑跟大模型之间到底发生了几次对话、每次发了什么?**

最近正好在做这方面的研究,顺道写一篇讲清楚。本文以 Claude Code(及其 Agent SDK)源码为样本,但"无状态模型 + 客户端编排"是这类工具共通的范式,结论大多可平移到 Codex 等其它 Agent。

---

你对 Agent 说一句「帮我写个文档」,它读了几个文件、改了几行代码、最后回你一段总结。看起来它「记得」自己刚做过什么、「知道」项目长什么样。

但底层有一个反直觉的事实:**模型什么都不记得。** 你发给 Claude 的每一次请求都是一张白纸,模型不知道上一秒发生了什么。Agent 表现出来的连续性、记忆、对项目的了解,**全部是 SDK 在你电脑这一端,每一轮重新拼出来再发过去的。**

这篇文章就沿着这一个事实往下推。你会看到:

- **请求流程** —— 一轮任务为什么是多次请求,每次都发了什么;
- **缓存** —— 既然每轮都重发全部历史,为什么没把你的钱包烧穿;
- **压缩** —— 历史越堆越长,装不进上下文窗口时会发生什么,你的文档内容还在不在。

> **一句话核心观点:** LLM 无状态;Agent 的「记忆」是客户端每轮把全部历史重新打包的产物。流程、缓存、压缩,都是为了让这件「每轮重发」的事又对、又快、又装得下。

---

## 目录

- [一、无状态:一切的起点](#一无状态一切的起点)
- [二、阶段一:初始化(本地备料,0 次模型请求)](#二阶段一初始化本地备料0-次模型请求)
- [三、阶段二:一次请求的解剖](#三阶段二一次请求的解剖)
  - [3.1 `system`:你是谁、规则是什么](#31-system你是谁规则是什么)
  - [3.2 `tools`:一份只读的菜单](#32-tools一份只读的菜单)
  - [3.3 `messages`:唯一会增长的部分](#33-messages唯一会增长的部分)
- [四、循环:一轮任务的多次往返](#四循环一轮任务的多次往返)
- [五、缓存:为什么"每轮重发"不烧钱](#五缓存为什么每轮重发不烧钱)
- [六、压缩:历史装不下时会发生什么](#六压缩历史装不下时会发生什么)
- [七、综合:一段文档内容的生命周期](#七综合一段文档内容的生命周期)
- [八、自己动手验证](#八自己动手验证)

---

## 一、无状态:一切的起点

Anthropic 的 `/messages` API 没有服务端会话。没有「session」、没有「记住上次」、没有握手。每次调用,你必须把模型需要知道的**一切**都塞进这一次请求里:它是谁、有哪些工具、之前聊了什么、文件里有什么。模型读完、回一句,然后立刻忘光。

于是,你脑子里"和 Agent 的一次对话",在网络上其实是这样的:

```
你说一句话
  → SDK 打包【系统提示 + 工具 + 全部历史】发出去 → 模型回复
  → 模型说"我要读文件" → SDK 在本地读完 → 把结果追加进历史
  → SDK 再打包【系统提示 + 工具 + 更长的历史】发出去 → 模型回复
  → ……如此往复,直到模型不再要求调工具
```

这就引出了全文的三个主题,它们都是这个事实的直接后果:

| 后果 | 带来的问题 | 解决机制 | 本文章节 |
|---|---|---|---|
| 每轮重发全部历史 | 内容大量重复,贵 | **prompt 缓存** | 第五章 |
| 历史只增不减 | 迟早撑爆上下文窗口 | **截断 / 压缩** | 第六章 |
| 工具调用要多次往返 | 一个任务 = 多次请求 | **agentic 循环** | 第四章 |

---

## 二、阶段一:初始化(本地备料,0 次模型请求)

很多人以为「初始化 Agent」时要先把系统提示发给模型让它"记住"。**这是错的** —— 既然模型无状态,就没有"先告诉它、它记下来"这回事。

初始化阶段做的事,本质是**备料**:把"待会儿每次请求都要带上的东西"在本地准备好。整个阶段**不向模型发任何请求**。

| 步骤 | 做什么 | 联网? |
|---|---|---|
| `init()` | 加载/校验 config、鉴权、遥测、信任目录、代理、mTLS | 仅连鉴权和遥测,**非模型** |
| 备 `tools` | 每个工具转成 JSON Schema | 否 |
| 备 `system` | `getSystemPrompt()`本地拼成 `string[]` | 否 |
| 连接 MCP | 启动/连接 MCP server,其工具并入 `tools` | SDK↔MCP,**非模型** |
| 备 `userContext` | CLAUDE.md + 日期,每轮现拼 | 否 |

> **可验证的事实:** 用 mitmproxy 抓包,初始化期间你抓不到任何 `/messages` 请求。第一条请求一定出现在你发出第一句话之后。

备料结束,内存里躺着三样东西:`system`、`tools`、`userContext`。下一章看它们怎么组进一次请求。

---

## 三、阶段二:一次请求的解剖

主循环是一个 `while(true)`,**每转一圈 = 一次 `/messages` 请求**。每次请求体长这样:

```jsonc
{
  "model":    "claude-opus-4-8",
  "system":   [ /* text block 数组:你是谁、规则。会话内基本不变 */ ],
  "tools":    [ /* 工具定义数组:有哪些工具、怎么用。不变 */ ],
  "messages": [ /* 对话历史。唯一每轮增长的部分 */ ],
  "max_tokens": 8192, "thinking": {...}, "betas": [...], "metadata": {...}
}
```

记住一个比例感:**`system` 和 `tools` 几乎不变(所以能缓存),只有 `messages` 在长。** 下面逐个拆。

### 3.1 `system`:你是谁、规则是什么

`system` **不是一个字符串,而是一个 text block 数组**:`[{type:"text", text:"...", cache_control?:{...}}, ...]`。它经历两层:先在内部以 `string[]`(类型 `SystemPrompt`)累积,发送前再切成带缓存标记的 block 数组。

#### (1) 拼接顺序

最终拼接顺序固定如下(`appendSystemContext` 会把 git 追加到 `getSystemPrompt` 结果尾部):

```
[0]   归属 header        getAttributionHeader(fingerprint)
[1]   CLI 身份前缀       getCLISyspromptPrefix(...)
[2..] 核心系统提示       getSystemPrompt(tools, model)
          └─ 末尾追加: systemContext(git status)
[n]   (可选) advisor / chrome 工具说明
```

#### (2) 归属 header(`getAttributionHeader` )

不是给模型读的提示,是计费/来源标记:
```
x-anthropic-billing-header: cc_version=2.2.1.<fingerprint>; cc_entrypoint=cli;
```
- `cc_version` = 版本号 + **fingerprint**(由第一条用户消息字符 + 版本算出)。
- `cc_entrypoint` = 来源(cli / sdk / …,读 `CLAUDE_CODE_ENTRYPOINT`)。
- 开了 `NATIVE_CLIENT_ATTESTATION` 还会带 `cch=00000` 占位,由 Bun 的 HTTP 层在发包前改写成真实校验 token(同长度替换,避免改 Content-Length)。
- 可关:`CLAUDE_CODE_ATTRIBUTION_HEADER=0`,关掉则返回空串被 `filter(Boolean)` 滤除。
- 缓存上始终标 `cacheScope: null`(fingerprint 每轮可能变,不进缓存)。

#### (3) CLI 身份前缀(`getCLISyspromptPrefix` )

三选一,决定模型"自我认知"那句话:

| 场景 | 前缀文本 |
|---|---|
| 交互式 CLI(默认)/ vertex provider | `You are Claude Code, Anthropic's official CLI for Claude.` |
| 非交互 + 有 appendSystemPrompt | `You are Claude Code, ... running within the Claude Agent SDK.` |
| 非交互 + 无 appendSystemPrompt | `You are a Claude agent, built on Anthropic's Claude Agent SDK.` |

> 用 Agent SDK 跑的是后两条之一 —— 这就是为什么 SDK Agent 自报身份和 CLI 不同。

#### (4) 核心系统提示(`getSystemPrompt` )

返回的 `string[]` 内部分成「静态(可全局缓存)」和「动态(每轮可能变)」两段,中间用一个**边界标记**隔开:

```
── 静态段(顺序固定,可全局缓存)──
  getSimpleIntroSection           身份/角色引言(受 output style 影响)
  getSimpleSystemSection          核心行为规则
  getSimpleDoingTasksSection      做任务的方法论(output style 关掉编码指令时省略)
  getActionsSection               动作/工程规范
  getUsingYourToolsSection(tools) 工具使用总则(随启用的工具集变化)
  getOutputEfficiencySection      输出精简规则

  __SYSTEM_PROMPT_DYNAMIC_BOUNDARY__   ← 边界标记(仅 global cache 模式插入)

── 动态段(registry 管理,resolveSystemPromptSections)──
  session_guidance   本会话特定指引(依赖启用的工具、skill 命令)
  memory             loadMemoryPrompt() 加载的记忆
  env_info_simple    环境信息(见下)
  language           语言设置
  output_style       输出风格
  mcp_instructions   已连接 MCP server 的用法(标 DANGEROUS_uncached,每轮重算,不缓存)
  scratchpad         草稿区指令
  frc                函数结果清理说明
  summarize_tool_results  工具结果总结规则
  token_budget       (仅 TOKEN_BUDGET feature)+500k 这类预算说明
  brief              (仅 KAIROS feature)简报
```

`env_info_simple`(`computeSimpleEnvInfo`)是个 `# Environment` 段,逐条列出:工作目录(worktree 会额外提示别 `cd` 回原仓库)、是否 git 仓库、附加目录、Platform / Shell / OS Version、当前模型名 + ID + knowledge cutoff、最新模型家族信息、Fast mode 说明。

#### (5) systemContext:git 快照(`appendSystemContext` )

`getSystemContext()`产出,作为**最后一段**拼进去:当前分支、主分支、`git status --short`(超 1000 字截断)、最近 5 条 commit、git user。`memoize` 缓存 → **整会话只算一次**,中途不更新。它落在边界之后,属动态段。

#### (6) 发送前切块(`buildSystemPromptBlocks`  → `splitSysPromptPrefix` )

把上面的 `string[]` 切成最终 block 数组,并按内容打缓存 scope:

| 模式 | 触发条件 | 切出的 block(cacheScope) |
|---|---|---|
| MCP 模式 | 有 MCP 工具 | 归属(null) + 前缀(org) + 其余合并(org) |
| 全局缓存模式 | 1P 且找到边界标记 | 归属(null) + 前缀(null) + 边界前静态(**global**) + 边界后动态(null) |
| 默认模式 | 3P provider 或无边界 | 归属(null) + 前缀(org) + 其余合并(org) |

> 源码硬注释:`Do not add any more blocks for caching or you will get a 400` —— API 对 system 里的缓存断点数量有上限,所以最多切 4 块。这就是为什么会变的内容(git、日期)要么放 messages、要么落在边界之后:**保护边界前那块大的静态前缀稳定命中全局缓存。**

### 3.2 `tools`:一份只读的菜单

`tools` 是模型的"菜单":有哪些工具、各自怎么用。**它只放定义,不放任何调用和结果** —— 模型决定调哪个工具(`tool_use`)、工具返回了什么(`tool_result`),全部在 `messages` 里。菜单本身整场不变。

#### (1) 每个工具的形状(`toolToAPISchema` )

```jsonc
{
  "name": "Edit",
  "description": "....(来自 tool.prompt(),告诉模型何时/如何用)....",
  "input_schema": { "type": "object", "properties": { "file_path": {...}, ... } }
}
```
`description` 由 `tool.prompt()` 动态生成;`input_schema` 优先用工具自带的 `inputJSONSchema`,否则把 Zod schema 转成 JSON Schema(`zodToJsonSchema`)。

#### (2) 会话级缓存,防止"抖动"破坏缓存

工具的 base schema(name / description / input_schema)算一次就**缓存在 `toolSchemaCache`**。原因很实际:`description` 里可能含随 GrowthBook 配置变化的措辞,若每轮重算,序列化出来的字节会变,进而**击穿 prompt 缓存**。所以这里刻意"冻结"住,保证 `tools` 数组逐字节稳定。

#### (3) 几个可选字段(按需叠加,)

| 字段 | 含义 | 条件 |
|---|---|---|
| `strict` | 结构化输出严格模式 | `tengu_tool_pear` 开 + 工具 `strict:true` + 模型支持 |
| `eager_input_streaming` | 细粒度工具流式(避免大入参卡顿) | 仅直连 `api.anthropic.com`(代理/Bedrock/Vertex 会 400) |
| `defer_loading` | 延迟加载(工具搜索用) | 工具搜索特性 |
| `cache_control` | 缓存标记 | 见第五章 |

`CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` 会把除 `cache_control` 外的 beta 字段全部剥掉,只留 `{name, description, input_schema}`。

#### (4) "完整列表"与"实际发送列表"的分离

有个微妙设计:`toolToAPISchema` 收到的是**完整工具列表**(让工具搜索的描述里能列出所有可用 MCP 工具),但真正进 API `tools` 数组的是过滤后的 `filteredTools`。过滤只影响"发什么",不影响"模型在描述里看到什么"。MCP 工具也并入这同一个数组,没有单独字段。

### 3.3 `messages`:唯一会增长的部分

这是全文的主角。它是 `user` / `assistant` 交替的数组,工具交互编码成块:

| 块类型 | 所在消息 | 内容 |
|---|---|---|
| `text` | user / assistant | 文本 |
| `tool_use` | assistant | 模型要调的工具:`{id, name, input}` |
| `tool_result` | user | 工具执行结果,`tool_use_id` 指回对应的 `tool_use` |
| `image` / `document` | user | 多模态附件 |
| `thinking` | assistant | 思考块(有签名,跨轮要保留,见下) |

#### (1) 开头每轮自动插两条 meta(`prependUserContext` )

每次请求,SDK 都在 `messages` **最前面临时插两条 user 消息**,内容来自 `userContext`:
```
user(meta): <project-instructions> CLAUDE.md 全文 </project-instructions>
user(meta): <system-reminder> 当前日期、用户邮箱… (附"可能无关"免责声明) </system-reminder>
... 真实对话历史 ...
```
要点:
- 它们**不在历史数组里**,每轮现拼、发完即弃 → 改完 CLAUDE.md 下一轮立刻生效。
- CLAUDE.md 单独用 `<project-instructions>` 包,**不**塞进带免责声明的 `<system-reminder>` —— 否则"可能无关"会削弱它的指令权重。
- 放 `messages` 开头而非 `system`:日期会变,放 system 会破坏 system 段缓存;放这里既能每轮刷新,又落在可缓存前缀里。

#### (2) 发送前的归一化(`normalizeMessagesForAPI` )

内部 message 格式不能直接发给 API,要先洗一遍:
- **剔除 virtual 消息**:纯展示用的(如 REPL 内部调用)绝不能进 API。
- **重排 attachment**:让附件"上浮"到合适位置(碰到 tool_result 或 assistant 边界为止)。
- **按错误剥离媒体块**:若历史里有"PDF 太大/图片太大"之类的合成错误,定位并剥掉对应的 `document`/`image` 块。
- 之后还有 `ensureToolResultPairing`(修复 tool_use/tool_result 配对)、`stripExcessMediaItems`(媒体超 100 个时丢最旧的)。

#### (3) thinking 块的纪律

`query.ts` 里专门有段"思考的规则"注释:含 thinking 块的消息必须在 `max_thinking_length > 0` 的请求里;thinking 块不能是最后一块;一段 assistant 轨迹内的 thinking 必须完整保留(含其后的 tool_use / tool_result 及下一条 assistant)。模型 fallback 切换时还要 `stripSignatureBlocks` —— 因为思考签名是绑模型的,replay 给别的模型会 400。

---

## 四、循环:一轮任务的多次往返

现在把三个字段放进真实流程。你说「帮我写一个文档」,模型决定先读文件、再创建、再编辑,最后回你。这一个任务在网络上是 **4 次请求**:

（下面省略每轮开头那两条 meta）

**第 1 轮**
```
发: user "帮我写一个文档"
回: assistant  text + tool_use(t1, Read, README.md)
```
有 tool_use → `needsFollowUp = true`→ 本地执行 Read → 结果包成 tool_result → 继续

**第 2 轮**(把第 1 轮全部 + 新结果整个重发)
```
发: user "帮我写一个文档"
    assistant tool_use(t1, Read)
    user tool_result(t1) → "<README.md 全文>"
回: assistant text + tool_use(t2, Write, docs/新文档.md)
```
本地执行 Write → 继续

**第 3 轮**
```
发: ...上面全部...
    assistant tool_use(t2, Write)
    user tool_result(t2, "创建成功")
回: assistant tool_use(t3, Edit, docs/新文档.md)
```
本地执行 Edit → 继续

**第 4 轮**
```
发: ...上面全部...
    assistant tool_use(t3, Edit)
    user tool_result(t3, "编辑成功")
回: assistant text "已写好,内容包括…"   ← 没有 tool_use
```
没有 tool_use → `needsFollowUp = false`→ **循环结束**,把这段文本作为最终回答返回。

**规律:请求轮数 = 工具调用次数 + 1**(末轮纯文本)。本例 Read + Write + Edit = 3 → 4 轮。

两条铁律:
1. **每个 `tool_use` 必须有配对的 `tool_result`**(靠 `tool_use_id`);中断/出错也得补占位 result,否则 API 400。守护:`yieldMissingToolResultBlocks`、`ensureToolResultPairing`。
2. **退出信号 = 本轮 assistant 不再返回 tool_use。**

到这里,流程讲完了。但你应该已经皱眉:第 4 轮把前 3 轮的所有内容(包括 README 全文)又发了一遍 —— 这不是巨大的浪费吗?下一章回答。

---

## 五、缓存:为什么"每轮重发"不烧钱

答案是 **prompt 缓存**。关键直觉:**一次请求的内容,绝大部分前缀和上一次逐字节相同。** 缓存就吃这个"相同前缀"。

#### 三个可缓存的表面

| 表面 | 怎么标 |
|---|---|
| `system` blocks | `splitSysPromptPrefix` 按 global/org/null 切块打 `cache_control` |
| `tools` | 工具数组带一个 `cache_control` 标记 |
| `messages` | **整请求只打一个** message 级 `cache_control` 标记(`addCacheBreakpoints`) |

#### messages 的缓存断点:只有一个,在最后

`addCacheBreakpoints`的核心就一行逻辑:
```
markerIndex = skipCacheWrite ? messages.length - 2 : messages.length - 1
```
**整个 messages 数组只在最后一条消息上打一个缓存标记。** 标记之前的全部前缀(`system` + `tools` + 除最后一条外的所有历史),只要逐字节没变,就是 **cache hit**:按缓存读价计费(约 1/10),不重算,延迟也低。

为什么只打一个?源码有段很深的注释:服务端的 KV cache 按"缓存边界"管理页面;**多打一个标记会让倒数第二个位置的 KV 页多存活一轮**,而那个位置永远不会被复用 —— 纯浪费。所以只保留最后一个。

#### 一张图看懂省在哪

```
[meta CLAUDE.md]   ┐
[meta 日期]         │
[user 帮我写文档]   ├─ 与上一轮逐字节相同 → 命中缓存,几乎不计费
[assistant ...]     │
[tool_result ...]   ┘
[本轮新追加的尾部]   ← 缓存断点在这附近;只有新内容真正重新计费
```

所以第 4 轮虽然"看起来"重发了 README 全文,但那部分作为稳定前缀命中了缓存,真正花钱的只有最新追加的几百 token。**这就是 agentic 循环能几十轮跑下去而不爆开销的根本原因。**

#### 服务器那头发生了什么:为什么计费有四种价格

前面都是客户端视角。换到服务端,收到一次请求后的处理大致是:

```
收到请求(带缓存断点标记)
  → 匹配:从头比对,看有多长的前缀已在缓存里
  → 读缓存:命中的前缀直接从缓存取(不重新计算)
  → 写缓存:断点处新出现、且被标了要缓存的内容,算一遍并存进缓存
  → 计算 + 回复:在完整上下文上推理,生成输出
```

正因为一次请求里的 token 会落到不同环节,**计费被拆成四种价格**(响应的 `usage` 里能看到对应字段):

| 价格 | usage 字段 | 对应什么 | 相对单价 |
|---|---|---|---|
| 缓存读取 | `cache_read_input_tokens` | 命中缓存的前缀(老历史、system、tools) | 最低(约基础输入的 1/10) |
| 缓存写入 | `cache_creation_input_tokens` | 这轮新进缓存的内容(本轮新追加的尾部) | 偏高(高于基础输入) |
| 基础输入 | `input_tokens` | 没被缓存覆盖的普通输入 | 标准 |
| 输出 | `output_tokens` | 模型生成的内容 | 最高 |

把第四章那个循环和这四种价格对上,就能理解成本结构:**多轮 agentic 循环里,绝大部分历史每轮都走"缓存读取"(便宜),真正贵的只有每轮新追加的那一小段(写入)+ 模型的回复(输出)。** 这也是为什么"每轮重发全部历史"在实践中并不可怕。

**为什么命中缓存会便宜?** 一句话:省掉了重复计算。Transformer 在生成时,要先为输入里每个 token 算出它的 Key / Value 向量(即所谓 prefill),这是最吃算力的一步;而一个 token 的 K/V 只取决于它自己和它前面的内容。于是对于一段**逐字节相同的前缀**,这些 K/V 每次算出来都一模一样。prompt 缓存做的事,就是把这段前缀算好的 K/V 张量存在服务端,命中时直接取用、跳过重算 —— 既省算力(所以便宜),也省时间(所以更快)。缓存读取价 ≈ 基础输入的 1/10,差的就是这部分省下的计算。

> 想深究 KV cache / attention 原理的,可搜 "transformer KV cache"、"prompt caching" 相关文章,或读 Anthropic 官方的 Prompt Caching 文档,这里不展开。

> 一个推论:压缩(第六章 Q2)之所以"这一次贵",就是因为它让一大段内容从「缓存读取」掉回了「缓存写入」—— 同样的 token,价格档位变了。

#### 推论:别乱动前缀

缓存的代价是脆弱:**前缀里任何一个字节变了,它之后的缓存全部失效、重新计费(从"读取"掉回"写入")。** 这条推论解释了前面所有看似奇怪的设计:
- 日期、CLAUDE.md 放 `messages` 开头而不是 `system` → 不污染 system 的全局缓存;
- 工具 schema 会话级冻结(`toolSchemaCache`)→ 防止措辞抖动击穿 `tools` 缓存;
- 缓存命中率检测会**排除 `defer_loading` 工具** → 因为 API 会剥掉它们,算 hash 时得对齐。

---

## 六、压缩:历史装不下时会发生什么

缓存解决了"贵",但没解决"装不下"。历史只增不减,迟早撞上模型的上下文窗口上限。Claude Code 有**四道闸**,从轻到重依次拦截。它们每轮在 `query.ts` 顶部按顺序跑。

#### 闸 1:超大工具结果当场截断(`applyToolResultBudget` )

每个工具有 `maxResultSizeChars` 预算。一次读了个 400KB 的文件?它的 `tool_result` 内容会被**截断/替换成占位**,原文从一开始就不会完整进上下文。替换记录可持久化(`recordContentReplacement`),resume 时还能对上。

#### 闸 2:snip(,`HISTORY_SNIP` feature)

局部裁剪老的工具结果,把省下的 token 数(`tokensFreed`)反馈给后面的 autocompact,让它的阈值判断更准。

#### 闸 3:microcompact —— 清空老工具结果的"正文"(`microCompact.ts`)

这是很巧妙的一招:**不删消息,只把老 `tool_result` 的内容替换成一句占位符**:
```
[Old tool result content cleared]
```
按 `tool_use_id` 定位,消息结构和配对关系完全不动,只是正文没了。两种触发:
- **计数式**(ant,`CACHED_MICROCOMPACT`):工具结果数量超 GrowthBook 配的阈值就清老的,保留最近 N 个;
- **时间式**(`evaluateTimeBasedTrigger`):两条消息间隔超过 `gapThresholdMinutes`(你离开很久再回来),清掉间隔前的工具结果。

对模型来说:它还看得见"我当时调了 Read 读了 README",但读到的具体内容变成了"[已清空]"。

#### 闸 4:autocompact —— 调一次模型把历史总结掉(`autoCompact.ts`)

最重的一道。当历史 token 数超过阈值时触发:
```
阈值 = 有效上下文窗口 − buffer        getAutoCompactThreshold
```
还有**预测式**版本:预估本轮增长会超窗,就提前压。

它的做法是 **fork 一个 agent、用一次额外的模型调用把旧历史总结成摘要**,然后用摘要替代原历史继续。压缩后的新历史由 `buildPostCompactMessages`拼成,顺序固定:
```
[边界标记] + [摘要消息] + [保留的近期消息(剥掉 toolUseResult)] + [恢复的文件附件] + [hook 结果]
```
它还会**智能恢复**:把最近动过的文件重新读回来(最多 5 个 / 50k token 预算,`POST_COMPACT_*`),避免摘要丢了关键上下文。连续失败 3 次后停止重试(`MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES`),防死循环。

#### microcompact vs autocompact 的本质区别

| | microcompact | autocompact |
|---|---|---|
| 动什么 | 只清 `tool_result` 正文 | 总结**整段**历史 |
| 代价 | 几乎免费(本地字符串替换) | 贵(一次额外模型调用) |
| 损失 | 只丢工具结果细节,结构留着 | 旧历史全变成一段摘要,粒度尽失 |
| 触发 | 工具结果多 / 长时间间隔 | 总 token 撞阈值 |

#### 关于压缩与缓存,三个常被问到的问题

**Q1:压缩是程序做的,还是 LLM 做的?**

两者都有,看哪道闸:
- **闸 1~3(截断 / snip / microcompact)是纯程序做的。** 它们只是本地的字符串操作 —— 截断超长文本、按 `tool_use_id` 把老结果替换成占位符。不调用模型,几乎零成本、瞬间完成。
- **闸 4(autocompact)是 LLM 做的。** 它 fork 一个子 agent,**额外发起一次模型请求**,让模型把旧历史读一遍、写成摘要。所以它慢、花钱,而且有损 —— 摘要质量取决于模型这一次的发挥。

**Q2:压缩后,之前的缓存是不是就失效了?这一次成本会很高吗?**

会失效,而且这一次确实更贵。原因回到第五章的铁律:**缓存吃的是"逐字节相同的前缀"。** autocompact 把一大段历史替换成了一段全新的摘要,等于从摘要那个位置开始,后面的内容全变了 —— 服务端缓存里对应的部分**全部作废**。

于是压缩后的第一次请求是一次「冷请求」:那段新内容要按 **cache-creation(缓存写入)** 计费,比 cache-read 贵(写入价高于读取价)。不过这是一次性的:写入之后,后续每轮又能照常命中这块新缓存。所以代价是「省下大量上下文 token」换「一次缓存重建 + 一次摘要模型调用」,长会话整体仍然划算。

> 注:相对地,microcompact 之所以"便宜",不只是因为不调模型,还因为它有专门的「缓存编辑」机制(`CACHED_MICROCOMPACT`),尽量只动被清理的那几块、少破坏缓存前缀。

**Q3:缓存在服务器上能留多久?我 resume 一个旧会话还能命中吗?**

服务端的 prompt 缓存是 **ephemeral(临时)** 的,有 TTL:
- **默认 5 分钟**:每次命中会刷新这 5 分钟的计时;只要你持续对话,缓存就一直续命。
- **可升到 1 小时**:符合条件时(`should1hCacheTTL`:ant 或未超额的订阅用户,且 querySource 在允许列表内;3P Bedrock 可用环境变量开启)会带 `ttl: '1h'`。

对 resume 的含义很直接:
- **在 TTL 窗口内 resume(比如刚断开几分钟)** → 缓存还在,第一条请求就能命中,便宜又快。
- **超过 TTL 再 resume(隔了几小时/隔天)** → 服务端缓存早已过期,resume 后的第一条请求是一次完整的冷写入(整个前缀按 cache-creation 计费),之后才重新暖起来。

也就是说,**缓存不会被持久化保存**,它只是一段时间内的加速;隔太久回来,等于从头建一次缓存。

---

## 七、综合:一段文档内容的生命周期

把全文串起来,跟踪你那份被 Read 读进来的文档全文,它在上下文里能活多久:

```
被 Read 读入 → 成 tool_result 进 messages
   │
   ├─ 不大 & 对话短   → 一直在,每轮重发(但命中缓存,不烧钱)
   ├─ 单条过大        → 闸1 applyToolResultBudget 截断,原文从不完整进上下文
   ├─ 工具调用变多    → 闸3 microcompact 把它正文清成"[已清空]"
   └─ 总历史撞阈值    → 闸4 autocompact 把它连同旧历史总结成一段摘要,原文消失
```

**最终结论:模型"还记不记得文档细节",等价于"那段内容是否还在未被压缩的历史里"。** 长任务里 Agent 偶尔"忘事",通常不是模型变笨了,是那段内容被压缩闸清掉了。

附:什么持久、什么不持久——

| 内容 | 进 messages 历史? | 每轮重发? | 备注 |
|---|---|---|---|
| 用户消息、assistant 回复、tool_use/result | 是(只追加) | 是 | 可能被压缩 |
| CLAUDE.md、日期(userContext) | 否 | 是(每轮现拼) | `prependUserContext` |
| system prompt、tools | 否(独立字段) | 是 | 走缓存 |
| git status | 否(在 system 尾部) | 是 | 会话开始算一次 |
| 内部 `toolUseResult` 对象 | — | 否 | 渲染后即释放,只留 API 用的块 |

---

## 八、自己动手验证

别只信文档,自己抓一次:

- **mitmproxy(最直接)**:把 SDK 的 `ANTHROPIC_BASE_URL` 指向本地代理,看每一发的完整 JSON —— `system`/`tools`/`messages` 一字不差。你会亲眼确认:初始化期间没有任何请求,第一条一定在你发消息之后;以及随着轮次推进,`messages` 怎么一段段变长。
- **`ANTHROPIC_LOG=debug`**:SDK 打印请求摘要。
- **本仓库自带**:`--dump-system-prompt`(`cli.tsx`)、`dumpPromptsFetch`专门 dump 每次请求体。

---

## 九、实用建议

理解了"每轮重发 + 缓存 + 压缩"这套机制,就能反推出怎么用才省、才准。分两类人。

### 9.1 个人使用(在终端里直接用 Claude Code / Codex 这类工具)

1. **别把无关文件拖进上下文。** 你读过的每个文件都会进 `messages`,之后每轮重发,也更早把你推向压缩闸。需要哪个文件再让它读哪个,读完用不上的可以明说"这个不用管了"。
2. **长任务里及时开新会话。** 一旦触发 autocompact(闸 4),旧历史被总结成摘要,细节会丢。与其在一个会话里硬撑到模型"忘事",不如在自然的任务边界 `/clear` 重开,上下文更干净、回答更准。
3. **把稳定的项目知识沉淀进 CLAUDE.md,而不是每次口头交代。** 它每轮都以高权重的 `<project-instructions>` 注入,且落在可缓存前缀里 —— 写一次,轮轮生效,还几乎不额外花钱。
4. **善用缓存的"前缀"特性:别频繁改系统级设置。** 中途切模型、改 output style、连/断 MCP 都会动到前缀,使缓存失效、下一轮变慢变贵。能一开始定好就别中途换。
5. **大输出让它写文件,而不是打印到对话里。** 几百行的内容直接 print 会永久占着 `messages`;让它写进文件、只回一句摘要,上下文清爽得多。

### 9.2 用 Agent SDK 做开发(把 Claude 接进自己的程序)

1. **务必开 prompt 缓存,并保持前缀稳定。** 这是省钱的命门(缓存读约 1/10 价)。把固定不变的内容(系统提示、工具定义、长背景)放在请求最前面,把每轮会变的东西(时间戳、用户输入、检索结果)放到后面 —— 顺序决定缓存命中率。
2. **会变的信息别塞进 `system`。** 学 Claude Code 的做法:动态内容放 `messages`(或边界标记之后),保护那块大的静态系统提示稳定命中全局缓存。
3. **工具的 `description` / `input_schema` 要"冻结"。** 如果你的工具描述里含动态拼接的内容(每轮不一样),会逐字节击穿 `tools` 缓存。让工具定义在会话内保持稳定。
4. **自己实现"上下文预算"。** SDK 不一定替你兜底超长历史。对工具结果设上限、截断超大输出、必要时做摘要 —— 否则迟早撞上下文窗口直接 400。可参考本文四道闸的思路(截断 → 局部清理 → 整体摘要)。
5. **守住 `tool_use` / `tool_result` 配对。** 这是最常见的 400 来源:发起了 `tool_use` 却没回对应的 `tool_result`(哪怕是报错占位也得回)。在你的循环里把这条当硬约束。
6. **想清楚循环的退出条件。** "模型不再返回 `tool_use` 即结束"是默认信号,但要加最大轮数 / 超时 / 预算上限做兜底,防止工具调用打转停不下来。

---

> **回到核心观点:** 模型无状态,Agent 的记忆是客户端每轮重建的。
> 流程(第四章)让它"对",缓存(第五章)让它"快、不贵",压缩(第六章)让它"装得下"。
> 三件事,一个根。
>
> 理解了这个根,无论你是在终端里用它,还是用 SDK 把它接进自己的系统,都能用得更省、更准。
