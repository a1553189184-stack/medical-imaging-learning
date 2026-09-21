(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const KEY_LOCAL = 'imageLabSopLocalV1';
  const KEY_QC = 'imageLabSopQcV1';
  const KEY_FLOW = 'imageLabSopWorkflowV1';
  const state = { tab:'library', system:'全部', query:'', selected:SOP_PROTOCOLS[0].id };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const read = (key,fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const write = (key,value) => { try { localStorage.setItem(key,JSON.stringify(value)); } catch {} };
  const systems = ['全部'].concat(Array.from(new Set(SOP_PROTOCOLS.map(item => item.sys))));
  let local = read(KEY_LOCAL,{}), qc = read(KEY_QC,[]), flow = read(KEY_FLOW,[]);

  function current() { return SOP_PROTOCOLS.find(item => item.id === state.selected) || SOP_PROTOCOLS[0]; }
  function merged(item) { return Object.assign({},item,local[item.id] || {}); }
  function notify(message) { const node=$('#notice'); if (!node) return; node.textContent=message; node.style.opacity='1'; clearTimeout(notify.timer); notify.timer=setTimeout(()=>node.style.opacity='0',2200); }
  function matches(item) {
    const query=state.query.trim().toLocaleLowerCase('zh-CN');
    return (state.system==='全部'||item.sys===state.system) && (!query||[item.name,item.view,item.sys,item.position,item.landmark,item.cr].join(' ').toLocaleLowerCase('zh-CN').includes(query));
  }
  function renderTabs() { $('#sopTabs').querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.sopTab===state.tab)); }
  function statHeader() { $('#sopProtocolCount').textContent=SOP_PROTOCOLS.length; $('#sopLocalCount').textContent=Object.keys(local).length; }

  function renderLibrary() {
    const items=SOP_PROTOCOLS.filter(matches);
    if (!items.some(item=>item.id===state.selected) && items.length) state.selected=items[0].id;
    const item=merged(current());
    return `<div class="sop-library-layout"><aside class="panel sop-browser"><label class="sop-search">检索项目<input id="sopSearch" type="search" value="${esc(state.query)}" placeholder="胸部、颈椎、Mortise…"></label><div class="sop-system-filter">${systems.map(system=>`<button class="${state.system===system?'active':''}" data-sop-system="${esc(system)}">${esc(system)}</button>`).join('')}</div><p class="sop-result-count">匹配 ${items.length} / ${SOP_PROTOCOLS.length} 项</p><div class="sop-protocol-list">${items.map(protocol=>`<button class="${protocol.id===state.selected?'active':''}" data-sop-protocol="${protocol.id}"><span>${esc(protocol.sys)} · ${esc(protocol.view)}</span><b>${esc(protocol.name)}</b><small>${esc(protocol.landmark)}</small></button>`).join('')||'<div class="empty-state">没有匹配项目</div>'}</div></aside><article class="sop-detail">${renderProtocol(item)}</article></div>`;
  }
  function renderProtocol(item) {
    return `<header class="sop-detail-head"><div><span>${esc(item.sys)} · ${esc(item.view)}</span><h2>${esc(item.name)}</h2><p>${local[item.id]?'已应用本院参数覆盖':'标准参考参数'}</p></div><button class="soft-button" data-sop-edit="${item.id}">${local[item.id]?'编辑本院参数':'设为本院参数'}</button></header><div class="sop-step-strip"><span><b>01</b>核对</span><span><b>02</b>摆位</span><span><b>03</b>准直</span><span><b>04</b>曝光</span><span><b>05</b>验收</span></div><div class="sop-detail-grid"><section class="panel sop-position-card"><h3>定位与摆位</h3><dl class="sop-kv"><dt>患者体位</dt><dd>${esc(item.position)}</dd><dt>定位标志</dt><dd>${esc(item.landmark)}</dd><dt>中心线</dt><dd>${esc(item.cr)}</dd><dt>SID</dt><dd>${esc(item.sid)}</dd><dt>准直范围</dt><dd>${esc(item.collimation)}</dd><dt>呼吸配合</dt><dd>${esc(item.breath)}</dd></dl></section><section class="panel"><h3>曝光策略</h3><div class="sop-tech"><span>参考技术</span><p>${esc(item.tech)}</p><span>AEC / mAs</span><p>${esc(item.aec)}</p></div><div class="sop-safety-note">参数不能脱离设备、探测器、体厚与本科室目标 EI/DI 使用；显示亮度不能替代曝光指标。</div></section><section class="panel sop-check-card"><h3>成片验收清单</h3>${item.criteria.map((criterion,index)=>`<label><input type="checkbox" data-sop-check="${item.id}-${index}"><span>${esc(criterion)}</span></label>`).join('')}</section><section class="panel"><h3>常见错误与纠正</h3><div class="sop-error-tags">${item.errors.map(error=>`<button data-sop-qc-reason="${esc(error)}">${esc(error)}<small>记录</small></button>`).join('')}</div><button class="primary sop-log-button" data-sop-log="${item.id}">记录本次重拍 / 废片</button></section></div>`;
  }
  function renderWorkflow() {
    const checked=new Set(flow);
    const count=SOP_WORKFLOW.filter((_,i)=>checked.has(i)).length;
    return `<div class="sop-workflow-grid"><section class="panel sop-workflow-main"><div class="sop-section-head"><div><span class="eyebrow">PRE-EXPOSURE TO ACCEPTANCE</span><h2>六步标准工作法</h2></div><strong>${count} / ${SOP_WORKFLOW.length}</strong></div><div class="sop-flow-progress"><i style="width:${count/SOP_WORKFLOW.length*100}%"></i></div><div class="sop-flow-list">${SOP_WORKFLOW.map((step,index)=>`<label class="${checked.has(index)?'done':''}"><input type="checkbox" data-sop-flow="${index}" ${checked.has(index)?'checked':''}><b>${String(index+1).padStart(2,'0')}</b><div><h3>${esc(step[0])}</h3><p>${esc(step[1])}</p></div></label>`).join('')}</div></section><aside><section class="panel sop-order"><h3>曝光后判断顺序</h3><ol><li>解剖覆盖是否完整</li><li>旋转、中心线与体位是否正确</li><li>运动、衣物和金属伪影</li><li>EI/DI 是否在本科室目标区间</li><li>Accept / Conditional / Repeat</li></ol></section><section class="panel sop-warning"><b>重拍不是默认选项</b><p>先判断图像是否足以回答临床问题，再综合辐射代价决定是否重拍。创伤患者不得为了“标准体位”强行活动。</p></section></aside></div>`;
  }
  function renderLocal() {
    const item=current(), override=local[item.id]||{};
    return `<div class="sop-editor-layout"><section class="panel"><div class="sop-section-head"><div><span class="eyebrow">LOCAL TECHNIQUE CHART</span><h2>本院参数覆盖</h2></div><span>${Object.keys(local).length} 项已保存</span></div><p class="sop-lead">保存本科室、本设备经验证的参数。仅存于当前浏览器，不会覆盖公共参考值。</p><label class="sop-field">摄影项目<select id="sopLocalProtocol">${SOP_PROTOCOLS.map(protocol=>`<option value="${protocol.id}" ${protocol.id===item.id?'selected':''}>${esc(protocol.sys)} · ${esc(protocol.name)}</option>`).join('')}</select></label><div class="sop-form-grid"><label class="sop-field">SID<input id="sopLocalSid" value="${esc(override.sid||item.sid)}"></label><label class="sop-field wide">kVp / mAs / AEC 技术说明<textarea id="sopLocalTech">${esc(override.tech||item.tech)}</textarea></label><label class="sop-field wide">AEC / 曝光控制说明<textarea id="sopLocalAec">${esc(override.aec||item.aec)}</textarea></label><label class="sop-field wide">科室备注<textarea id="sopLocalNote">${esc(override.note||'')}</textarea></label></div><div class="sop-editor-actions"><button class="primary" id="sopSaveLocal">保存本院参数</button><button class="soft-button" id="sopResetLocal" ${override.sid||override.tech||override.aec||override.note?'':'disabled'}>恢复公共参考值</button></div></section><aside class="panel sop-local-preview"><span class="eyebrow">CURRENT REFERENCE</span><h3>${esc(item.name)}</h3><dl class="sop-kv"><dt>SID</dt><dd>${esc(item.sid)}</dd><dt>技术</dt><dd>${esc(item.tech)}</dd><dt>AEC</dt><dd>${esc(item.aec)}</dd></dl></aside></div>`;
  }
  function renderQc() {
    const recent=qc.filter(row=>Date.now()-row.time<=30*86400000), counts={}; recent.forEach(row=>counts[row.reason]=(counts[row.reason]||0)+1); const max=Math.max(1,...Object.values(counts));
    return `<div class="sop-qc-layout"><section class="panel"><div class="sop-section-head"><div><span class="eyebrow">REJECT ANALYSIS</span><h2>重拍 / 废片记录</h2></div><span>近 30 天</span></div><div class="sop-qc-metrics"><div><strong>${recent.length}</strong><span>记录</span></div><div><strong>${new Set(recent.map(row=>row.protocol)).size}</strong><span>涉及项目</span></div><div><strong>${Object.keys(counts).length}</strong><span>原因类型</span></div></div><div class="sop-bars">${Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([reason,count])=>`<div><span>${esc(reason)}</span><i><b style="width:${count/max*100}%"></b></i><strong>${count}</strong></div>`).join('')||'<div class="sop-empty-qc">暂无记录。发生重拍时记录首要原因，才能形成可改进的数据。</div>'}</div></section><section class="panel"><h2>新增记录</h2><form id="sopQcForm" class="sop-form-grid"><label class="sop-field wide">摄影项目<select id="sopQcProtocol">${SOP_PROTOCOLS.map(protocol=>`<option value="${protocol.id}" ${protocol.id===state.selected?'selected':''}>${esc(protocol.name)}</option>`).join('')}</select></label><label class="sop-field wide">首要原因<select id="sopQcReason">${SOP_REJECT_REASONS.map(reason=>`<option>${esc(reason)}</option>`).join('')}</select></label><label class="sop-field wide">匿名备注（可选）<textarea id="sopQcNote" maxlength="300" placeholder="只记录技术问题，不填写患者身份信息"></textarea></label><button class="primary" type="submit">保存质控记录</button></form></section></div>`;
  }
  function render() {
    if (!$('#sopContent')) return;
    statHeader(); renderTabs();
    $('#sopContent').innerHTML=state.tab==='library'?renderLibrary():state.tab==='workflow'?renderWorkflow():state.tab==='local'?renderLocal():renderQc();
  }
  function switchTab(tab) { state.tab=tab; render(); }
  $('#sopTabs').addEventListener('click',event=>{ const button=event.target.closest('[data-sop-tab]'); if(button)switchTab(button.dataset.sopTab); });
  $('#sopContent').addEventListener('input',event=>{ if(event.target.id==='sopSearch'){state.query=event.target.value;render();$('#sopSearch')?.focus();} });
  $('#sopContent').addEventListener('change',event=>{
    if(event.target.matches('[data-sop-flow]')){const index=Number(event.target.dataset.sopFlow);flow=event.target.checked?Array.from(new Set(flow.concat(index))):flow.filter(item=>item!==index);write(KEY_FLOW,flow);render();}
    if(event.target.id==='sopLocalProtocol'){state.selected=event.target.value;render();}
  });
  $('#sopContent').addEventListener('click',event=>{
    const system=event.target.closest('[data-sop-system]'); if(system){state.system=system.dataset.sopSystem;render();return;}
    const protocol=event.target.closest('[data-sop-protocol]'); if(protocol){state.selected=protocol.dataset.sopProtocol;render();return;}
    const edit=event.target.closest('[data-sop-edit]'); if(edit){state.selected=edit.dataset.sopEdit;switchTab('local');return;}
    const quick=event.target.closest('[data-sop-qc-reason]'); if(quick){const p=current();qc.push({time:Date.now(),protocol:p.id,reason:quick.dataset.sopQcReason,note:''});write(KEY_QC,qc);notify('已记录：'+quick.dataset.sopQcReason);return;}
    if(event.target.closest('[data-sop-log]')){switchTab('qc');return;}
    if(event.target.id==='sopSaveLocal'){const item=current();local[item.id]={sid:$('#sopLocalSid').value.trim(),tech:$('#sopLocalTech').value.trim(),aec:$('#sopLocalAec').value.trim(),note:$('#sopLocalNote').value.trim()};write(KEY_LOCAL,local);notify('本院参数已保存到当前浏览器');render();return;}
    if(event.target.id==='sopResetLocal'){delete local[current().id];write(KEY_LOCAL,local);notify('已恢复公共参考值');render();}
  });
  $('#sopContent').addEventListener('submit',event=>{if(event.target.id!=='sopQcForm')return;event.preventDefault();qc.push({time:Date.now(),protocol:$('#sopQcProtocol').value,reason:$('#sopQcReason').value,note:$('#sopQcNote').value.trim()});if(qc.length>500)qc=qc.slice(-500);write(KEY_QC,qc);notify('质控记录已保存');render();});
  window.SopCenter={render,switchTab};
  if ($('#sop')?.classList.contains('active')) render();
})();
