/**
 * Created by rodrigoburg on 23/03/15.
 */

/*
Quando criar o seletor, lembrar de setar valor_seletor (indica o índice - dispersao ou nao) 

e controle_seletor ( indica se o axis já foi construído)

*/


/* Preciso destas */
var x_padrao = "dispersao";
var y_padrao = "governismo";
var raio_padrao = "num_deputados";
var transparencia_padrao = "dispersão";
var eixos_selecionados = [x_padrao,y_padrao]


var url = "http://estadaodados.com/basometro/dados/variancia_camara.json"
url = "data/variancia_camara.json"
var url_ministerio = "https://spreadsheets.google.com/feeds/cells/1cR-OkyIUsU3vTw2JiCc9JbyTWvBl2dlzvtSfeTczlx0/3/public/values?alt=json"


//div da tooltip
var div = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// função para poder executar uma correção para cada grupo de círculos
// Retorna um valor para cada grupo. 1, para o grupo 1; 2, para o grupo 2; 4, para o grupo 3.
// A diferença 
var correcao_grupos = function() {
    if ( controle_circulos >= 2*max_circulos ) {
        if ( controle_circulos == 3*max_circulos) {
            controle_circulos = 1;
            return 1;
        }
        controle_circulos += 1;
        return 5;
    }
    else if ( controle_circulos >= max_circulos ) {
        controle_circulos += 1;
        return 2;
    }
    else {
        controle_circulos += 1;
        return 1;
    }
}

var controle_circulos = 0; // ordenação de círculos para a função
var max_circulos; // número máximo de círculos 
var raio_grupo;
var ano;
var partido_data = {} //variável que mostra quais datas existem para cada partido
var dragging = false

// Escala para raio 

var raioScale = d3.scale.linear()
	.domain([1,2, 5])
	.range([5,2, 1]);



// Various accessors that specify the four dimensions of data to visualize.
function x(d) { return d.dispersao; }
function y(d) { return d.governismo; }
function radius(d) { return d.num_deputados; }
function key(d) { return d.name; }
function rice(d) { return(d.rice/100); }
function lider(d) { return d.fidelidade_lider; }


var seletor_x = {
    "dispersao": [ 0.0, 7, "índice de dispersão",  function(d) { return dispScale( x(d) )  ; }],
    "rice": [ 1.0, 0.3, "índice de rice", function(d) { return rice(d); } ],
    "fidelidade_lider": [ 80, 100, "fidelidade ao líder", function(d) { return lider(d);} ],
    "governismo":[ 20, 100, "índice de governismo", function(d) { return y(d); } ],
    "num_deputados": [ 0, 100, "número de parlamentares", function(d) { return radius(d); } ]
    //,"discricionario":[0,7500, "gasto discricionario", function (d) { return (d.discricionario == "-") ? [] : d.discricionario/1000000 }],
    //"obrigatorio":[0,45000, "gasto obrigatorio", function (d) { return (d.obrigatorio == "-") ? [] : d.obrigatorio/1000000 }]
}

// Cria escala para dispersão
var dispScale = d3.scale.linear()
    .domain([0,25])
    .range([0,10]);

var escala_transparencia = d3.scale.linear()
    .domain([seletor_x[x_padrao][0],seletor_x[x_padrao][1]])
    .range([0,10]);

function seleciona(d, padrao) {
	return seletor_x[padrao][3](d);        
}


// Chart dimensions.
var margin = {top: 70, right: 19.5, bottom: 19.5, left: 39.5},
    width = 900 - margin.right,
    height = 500 - margin.top - margin.bottom;

// Various scales. These domains make assumptions of data, naturally.
var xScale = d3.scale.linear().domain([seletor_x[x_padrao][0], seletor_x[x_padrao][1]]).range([50, width]),
    yScale = d3.scale.linear().domain([20, 100]).range([height, 0]),
    radiusScale = d3.scale.sqrt().domain([1, 100]).range([0, 70]);



// The x & y axes.
var xAxis = d3.svg.axis().orient("bottom").scale(xScale),
    yAxis = d3.svg.axis().scale(yScale).orient("left");

// Create the SVG container and set the origin.
var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom+40)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//cria um retangulo vazio para clicar e a tooltip sumir
    svg.append("rect")
        .attr("x", -30)
        .attr("y", -30)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom -20)
        .style("opacity", 0)
        .on("click", function (d) { //tira tooltip se clicar em algum lugar do svg
            div.transition()
                .duration(400)
                .style("opacity", 0);
        });

// variável que guarda os meses e perdidos que estão nos dados
var periodo = []
var partidos = []
var partidos_selecionados = []
var cores = {}

// tradução do mês
var traducao_mes = {
    "01":"jan",
    "02":"fev",
    "03":"mar",
    "04":"abr",
    "05":"mai",
    "06":"jun",
    "07":"jul",
    "08":"ago",
    "09":"set",
    "10":"out",
    "11":"nov",
    "12":"dez"
}

var paleta = {
    PTC:'#A11217',
    PT:'#BE003E',
    PCdoB:'#BC005C',
    PSL:'#BA007C',
    PRB:'#98007F',
    PRTB:'#7B057E',
    PP:'#5E196F',
    PHS:'#45187D',
    PMDB:'#3A3A8B',
    PTB:'#00408F',
    PRP:'#00528B',
    PSB:'#0066A4',
    PROS:'#007CC0',
    PTN:'#009BDB',
    PDT:'#0096B2',
    PR:'#009493',
    PTdoB:'#008270',
    PV:'#009045',
    PSC:'#00602D',
    PMN:'#5F8930',
    PSD:'#7BAC39',
    PEN:'#A3BD31',
    PSDC:'#CAD226',
    SDD:'#FEEE00',
    PSOL:'#E9BC00',
    PPS:'#B6720A',
    DEM:'#9A740F',
    PSDB:'#634600',
    PST:'#634600',
    PL:'#634600',
    PPL:'#634600',
    PMR:'#634600',
    PFL_DEM:'#634600',
    PRONA:'#634600',
    PAN:'#634600',
    PPB:'#634600'
}

//função para baixar os dados dos ministérios
var baixa_dados = function () {
    $.getJSON(url_ministerio, function (d) {
        var dados_ministerios = le_planilha(d)
        desenha_grafico(dados_ministerios)
    })
}

var le_planilha = function(d) {
    var cells = d.feed.entry; // d são os dados recebidos do Google...
    var numCells = cells.length;
    var cellId, cellPos , conteudo;
    var celulas = {}
    var titulos = {};

    for(var i=0; i < numCells; i++) {

        // lê na string do id a coluna e linha
        cellId = cells[i].id.$t.split('/');
        cellPos = cellId[cellId.length - 1].split('C');
        cellPos[0] = cellPos[0].replace('R', '');
        conteudo = cells[i].content.$t

        if (cellPos[0] == "1") {
            titulos[cellPos[1]] = conteudo

        } else {
            if (!(cellPos[0] in celulas)) {
                celulas[cellPos[0]] = {}
            }
            celulas[cellPos[0]][titulos[cellPos[1]]] = conteudo
        }
    }
    var saida = []
    for (var key in celulas) {
        saida.push(celulas[key])
    }
    return saida
}

var conserta_mes = function (mes) {
    return ("0" + mes).slice(-2);
}

//função que junta os dados do json com os dados do google docs sobre os ministérios
var junta_dados = function (dados1,dados2) {
    var obrigatorio = {}
    var discricionario = []
    dados2.forEach(function (d){
        if (partidos.indexOf(d.sigla) > -1) {
            if (!(d.sigla in obrigatorio)) {
                obrigatorio[d.sigla] = []
                discricionario[d.sigla] = []
            }
            obrigatorio[d.sigla].push([d.ano + "-"+conserta_mes(d.mes)+"-01", d.obrigatorio])
            discricionario[d.sigla].push([d.ano + "-"+conserta_mes(d.mes)+"-01", d.discricionario])
        }
    })

    dados1.forEach(function (d) {
        if (d.name in obrigatorio) {
            d.obrigatorio = obrigatorio[d.name]
            d.discricionario = discricionario[d.name]
        }
    })

    return dados1

}
// Load the data.
var desenha_grafico = function (dados_ministerios) {
    d3.json(url, function(nations) {

        // Add the x-axis.
        function adiciona_xaxis() {
            $(".texto_x").text(seletor_x[x_padrao][2]);
            $(".x").remove();
            xScale = d3.scale.linear().domain([seletor_x[x_padrao][0], seletor_x[x_padrao][1]]).range([50, width]);
            xAxis = d3.svg.axis().orient("bottom").scale(xScale);
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);
        }

        function adiciona_yaxis() {
            $(".texto_y").text(seletor_x[y_padrao][2]);
            $(".y").remove();
            yScale = d3.scale.linear().domain([seletor_x[y_padrao][0], seletor_x[y_padrao][1]]).range([height, 0]);
            yAxis = d3.svg.axis().scale(yScale).orient("left");
            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis);
        }

        adiciona_xaxis();
// Add the y-axis.
        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);

//tira eixo y
        $($("path")[1]).hide()

// Add an x-axis label.
        svg.append("text")
            .attr("class", "axis texto_x")
            .attr("text-anchor", "end")
            .attr("x", width - 35)
            .attr("y", height - 6)
            .text("índice de dispersão");

// Add a y-axis label.
        svg.append("text")
            .attr("class", "axis texto_y")
            .attr("text-anchor", "end")
            .attr("y",6)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .text("índice de governismo");

// Add the year label; the value is set on transition.
        var label = svg.append("text")
            .attr("class", "year label")
            .attr("text-anchor", "end")
            .attr("y", height - 24)
            .attr("x", width)
            .text("fev 2015");

//adiciona o nome do governo
        var governo = svg.append("text")
            .attr("class","governo label")
            .attr("text-anchor","end")
            .attr("y", 50)
            .attr("x", width)
            .text("Lula 1");

        coloca_botoes()

        partidos = acha_partidos(nations)
        partidos_selecionados = partidos
        nations = junta_dados(nations, dados_ministerios)
        periodo = acha_periodo(nations)
        partido_data = acha_data(nations)

        //faz um multiplicador que transformará o index de cada partido em um número entre 0 e o total de cores da paleta)
        var multiplicador = Object.keys(paleta).length/partidos.length

        for (p in partidos) {
            var cor = parseInt(p*multiplicador)
            //após calcular o index novo do partido, adiciona isso numa variável global
            cores[partidos[p]] = paleta[cor]
        }

// A bisector since many nation's data is sparsely-defined.
        var bisect = d3.bisector(function(d) { return d[0]; });
        var tres = [ interpolateData(0), interpolateData(0) , interpolateData(0)];
        max_circulos = interpolateData(0).length;
// Add a dot per nation. Initialize the data at 0 (primeiro mês), and set the colors.
        var grupo = svg.append("g")
            .attr("class", "grupos")
            .selectAll("g")
            .data(tres)
            .enter().append("g");

        var dot = grupo
            .selectAll(".dot")
            .data(function(d, i) { return d; } ) // d is a array[i]
            .enter().append("circle")
            .attr("partido", function(d) { return d.name})
            .attr("class", "dot")
            .style("fill", function(d, i) { return paleta[d.name]; })
            .style("stroke", function(d) { return paleta[d.name]; })
            .call(position)
            .sort(order)
            .on("mouseover", function (d) {
                var html = "<b>"+d.name + "</b></br>"+seletor_x[x_padrao][2]+": " + Math.round(seleciona(d, x_padrao)*10)/10 + "</br>"+seletor_x[y_padrao][2]+": " + Math.round(seleciona(d, y_padrao)*10)/10
                div.html(html)
                div.style("left", (d3.event.pageX - 50) + "px")
                    .style("top", (d3.event.pageY - 50) + "px")
                div.transition()
                    .duration(300)
                    .style("opacity", 1);
            })
            .on('mousemove', function(d) {
                div.style("left", (d3.event.pageX - 50) + "px")
                    .style("top", (d3.event.pageY - 50) + "px");
            })
            .on("mouseout", function(d) {
                div.transition()
                    .duration(400)
                    .style("opacity", 0);
            });

// Add an overlay for the year label.
        var box = label.node().getBBox();

        var overlay = svg.append("rect")
            .attr("class", "overlay")
            .attr("x", box.x)
            .attr("y", box.y-40)
            .attr("width", box.width)
            .attr("height", box.height+100)
            .on("click", enableInteraction);

// começo da transição para explicar o gráfico.
        svg.transition()
            .duration(5000).ease("linear")
            .tween("year", tweenYear)
            .each("end", enableInteraction	);


// Positions the dots based on data.
        function position(dot) {
            dot
                .transition().duration(100)
                .attr("cx", function(d) {
                    return(xScale(seleciona(d, x_padrao))); } )
                .attr("cy", function(d) { return yScale(seleciona(d, y_padrao)); })
                .attr("r", function(d) { raio_grupo = correcao_grupos(); return Math.abs(radiusScale(seleciona(d, raio_padrao)/raioScale(raio_grupo))); })
                .attr("fill-opacity", function(d) {
                    raio_grupo = correcao_grupos();
                    //var l = escala_transparencia(seleciona(d, x_padrao) );
                    //var opacidade = Math.pow((1-l/10),1.1);
                    var opacidade = 0.5
                    opacidade = opacidade/(Math.pow(raio_grupo,.01));
                    return opacidade;
                })// Repare na função da transparência. Ela obtem a opacidade pelo valor de x e divide pela raiz quadrada do raio_grupo (1, 2 ou 4)
                .attr("stroke-width", "0")
                .style("visibility", function(d) {
                    return aparece(d)
                });
        }

        //checa se o partido tem a data em questão. se não tiver, tira ele do gráfico
        function aparece(d) {
            return partido_data[d.name].indexOf(ano) > -1 ? "visible":"hidden";
        }

// Defines a sort order so that the smallest dots are drawn on top.
        function order(a, b) {
            return radius(b) - radius(a);
        }

// After the transition finishes, you can mouseover to change the year.
        function enableInteraction() {
            var yearScale = d3.scale.linear()
                .domain([0, (periodo.length-1)])
                .range([box.x + 10, box.x + box.width - 10])
                .clamp(true);

// Cancel the current transition, if any.
            svg.transition().duration(3000).ease("linear");

            overlay
                .on("touchstart",mousedown)
                .on("touchmove",mousemove)
                .on("touchend",mouseout)
                .on("touchleave",mouseout)
                .on("mouseover", mouseover)
                .on("mouseout", mouseout)
                .on("mousedown",mousedown)
                .on("mouseup",mouseup)
                .on("mousemove",mousemove);

            function mouseover() {
                label.classed("active", true);
            }

            function mouseout() {
                dragging=false;
                label.classed("active", false);
            }

            function mousedown() {
                dragging = true;
            }

            function mouseup() {
                dragging = false;
            }

            function mousemove() {
                if (dragging == true) {
                    displayYear(yearScale.invert(d3.mouse(this)[0]));
                }
            }
        }

// Tweens the entire chart by first tweening the year, and then the data.
// For the interpolated data, the dots and label are redrawn.
        function tweenYear() {
            var year = d3.interpolateNumber(0, periodo.length -1);
            return function(t) { displayYear(year(t));};
        }

// Updates the display to show the specified year.
        function displayYear(year) {
            dot.data(interpolateData(year), key).call(position).sort(order);
            label.text(escreve_data(year));
        }

        function escreve_data(year) {
            if (year == periodo.length) {
                year = year -1
            }
            var temp = periodo[Math.floor(year)];
            var ano = temp.split("-")[0]
            var mes = traducao_mes[temp.split("-")[1]]
            //aruma o label do governo
            if (ano < 2007) {
                governo.text("Lula 1")
            } else if (ano < 2011) {
                governo.text("Lula 2")
            } else if (ano < 2015) {
                governo.text("Dilma 1")
            } else {
                governo.text("Dilma 2")
            }
            return mes + " " + ano
        }
// Interpolates the dataset for the given (fractional) year.
        function interpolateData(year) {
            year = periodo[Math.floor(year)]
            ano = year

            var a = nations.map(function(d) {
                var saida = {}
                saida["name"] = d.name
                for (var item in seletor_x) {
                    saida[item] = interpolateValues(d[item],year)
                }
                return saida
            });
            return(a)
        }

// Finds (and possibly interpolates) the value for the specified year.
        function interpolateValues(values, year) {
            if (values == undefined || values.length == 0) {
                return [] //retorna vazio se não tiver dado para esse período
            }

            var i = bisect.left(values, year, 0, values.length - 1),
                a = values[i];
            return a[1];
        }

        function acha_periodo(dados) {
            var saida = []
            dados.forEach(function (e) {
                if (e.name == "PT") {
                    e.governismo.forEach(function (d) {
                        saida.push(d[0])
                    })
                }
            })
            return saida

        }

        function acha_partidos(dados) {
            var saida = []
            dados.forEach(function (d) {
                saida.push(d.name)
            })
            return saida
        }

        function acha_data(dados) {
            var saida = {}
            dados.forEach(function (d) {
                if (!(d.name in saida)) {
                    saida[d.name] = []
                }
                d.governismo.forEach(function (e) {
                    saida[d.name].push(e[0])
                })
            })
            return saida

        }

        adiciona_partidos()

        function coloca_botoes() {
            //botao
            var botao_x = $( "#eixo_x" )
                .button({
                    icons: { primary: "ui-icon-carat-1-s"}
                })
                .css("height","18px")
                .css("width","35px")
                .position({
                    my:"left+10",
                    at:"right",
                    of:".texto_x"
                })
                .click(function (){
                    if ($("#caixa_eixo_x").css("display") == "block") {
                        $("#caixa_eixo_x").css("display","none")
                    } else {
                        $("#caixa_eixo_x").css("display","block")
                    }

                });

            var caixa_x = $('#caixa_eixo_x')
                .addClass('ui-corner-all ui-widget')
                .position({
                    my:"right top-12",
                    at:"right bottom",
                    of:"#eixo_x"
                });

            var botao_y = $( "#eixo_y" )
                .button({
                    icons: { primary: "ui-icon-carat-1-e"}
                })
                .css({height:"19px",width:"30px"})
                .position({
                    my:"center bottom-5",
                    at:"left top",
                    of:".texto_y"
                })
                .click(function (){
                    if ($("#caixa_eixo_y").css("display") == "block") {
                        $("#caixa_eixo_y").css("display","none")
                    } else {
                        $("#caixa_eixo_y").css("display","block")
                    }

                });

            var caixa_y = $('#caixa_eixo_y')
                .addClass('ui-corner-all ui-widget')
                .position({
                    my:"right top",
                    at:"right top",
                    of:"#eixo_y"
                });


            for(var key in seletor_x) {
                caixa_x.append("<li id="+key+">"+seletor_x[key][2]+"</li>")
                caixa_y.append("<li id="+key+">"+seletor_x[key][2]+"</li>")
            }

            $("li")
                .on("click",function (){
                    if ($(this).parent().attr("id") == "caixa_eixo_x") {
                        x_padrao = $(this).attr("id")
                        adiciona_xaxis()
                        $("#caixa_eixo_x").css("display","none")
                        dot.call(position)
                    } else {
                        y_padrao = $(this).attr("id")
                        adiciona_yaxis()
                        $("#caixa_eixo_y").css("display","none")
                        dot.call(position)
                    }
                    //atualiza a variável eixos_selecionados pra mudar as tooltips
                    eixos_selecionados = [x_padrao,y_padrao]
                    esconde_lista()
                }
            )
        }

    });
}


//função para o menu de partidos
function toggleSelect(el) {
    var container_selecionadas = $("#partSelecionados"),
        container_n_selecionadas = $("#partNSelecionados"),
        item = $(el).parent();
    $(el).toggleClass("selecionada").toggleClass("nao-selecionada").toggleClass("glyphicon").toggleClass("glyphicon-remove-circle");
    if (item.parent()[0].id == "partNSelecionados") {
        container_selecionadas.append(item);
        partidos_selecionados.push($(el).text());
        coloca_partido($(el).text())
    } else {
        container_n_selecionadas.append(item);
        partidos_selecionados.splice(partidos_selecionados.indexOf($(el).text().trim()),1);
        tira_partido($(el).text())
    }
    $("#partSelecionados li").sort(sort_comp).appendTo("#partSelecionados");
    $("#partNSelecionados li").sort(sort_comp).appendTo("#partNSelecionados");
}

function tira_todos() {
    var el = $(".selecionada")
    el.each(function (d,item) {
        if ($(item).text() != "Retirar todos") 
            toggleSelect(item)
    })
}

function coloca_todos() {
    var el = $(".nao-selecionada")
    el.each(function (d,item) {
        if ($(item).text() != "Selecionar todos") 
            toggleSelect(item)
    })
    
}

function sort_comp(a,b) {
    return $(b).data('pos') < $(a).data("pos") ? 1 : -1;
}

function adiciona_partidos() {
    var botao = $("#partSelecionados")
    //primeiro botão é o que tira todos
    var item = '<li role="presentation" data-pos="'+1+'"><a role="menuitem" style="width:140px" onclick="tira_todos();" class="selecionada" tabindex="-1" href="#">Retirar todos</a></li>'
    botao.append(item)
    
    var i = 2
    partidos.forEach(function (d) {
        item = '<li role="presentation" data-pos="'+i+'"><a role="menuitem" style="width:100px" onclick="toggleSelect(this);" class="selecionada glyphicon glyphicon-remove-circle" tabindex="-1" href="#"> '+d+'</a></li>'
        botao.append(item)
        i++
    })
    
    //e, na outra lista, colocamos botão que coloca todos
    item = '<li role="presentation" data-pos="1"><a role="menuitem" style="width:140px"onclick="coloca_todos();" class="nao-selecionada" tabindex="-1" href="#">Selecionar todos</a></li>'
    $("#partNSelecionados").append(item)
}

function coloca_partido(sigla) {
    $("circle[partido='"+sigla.trim()+"']").show()
}

function tira_partido(sigla) {
    $("circle[partido='"+sigla.trim()+"']").hide()
}

function esconde_lista() {
    $("#rodapes").find("li").each(function (a,e) {
        if (eixos_selecionados.indexOf(e.id) == -1) {
            $(e).hide()
        } else {
            $(e).show()
        }
    })
}
function coloca_rodapes() {
    //acha as divs do rodapé e vai colocando hover em uma por uma
    $("#rodapes").find("li").each(function (a,e) {
        //as criancas de cada div são o "p" com o nome do índice e o "span" que é a tooltip
        var criancas = $(e).children()

        var tecnica = d3.select(criancas[1])


        d3.select(criancas[0])
            .on("mouseover", function (d) {
                tecnica.style("left", (d3.event.pageX - 50) + "px")
                    .style("top", (d3.event.pageY - 120) + "px")
                tecnica.transition()
                    .duration(300)
                    .style("display", "block");
            })
            .on('mousemove', function(d) {
                tecnica.style("left", (d3.event.pageX - 50) + "px")
                    .style("top", (d3.event.pageY - 120) + "px");
            })
            .on("mouseout", function(d) {
                tecnica.transition()
                    .duration(400)
                    .style("display", "none");
            });
    })

    //esconde os que não são default
    esconde_lista()
}

//roda o script
baixa_dados()
coloca_rodapes()




