/**
 * Created by rodrigoburg on 23/03/15.
 */

var url = "http://estadaodados.com/basometro/dados/variancia_camara.json"
url = "data/variancia_camara.json"

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
function x(d) { return d.variancia; }
function y(d) { return d.governismo; }
function radius(d) { return d.num_deputados; }
function key(d) { return d.name; }

// Chart dimensions.
var margin = {top: 70, right: 19.5, bottom: 19.5, left: 39.5},
    width = 900 - margin.right,
    height = 500 - margin.top - margin.bottom;

// Various scales. These domains make assumptions of data, naturally.
var xScale = d3.scale.linear().domain([0, 3.0]).range([50, width]),
    yScale = d3.scale.linear().domain([20, 100]).range([height, 0]),
    radiusScale = d3.scale.sqrt().domain([1, 100]).range([0, 70]);

// Cria escala para dispersão
var transScale = d3.scale.linear()
	.domain([0,50])
	.range([0,10]);


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
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
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



// Add the x-axis.
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

// Add the y-axis.
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

// Add an x-axis label.
svg.append("text")
    .attr("class", "axis")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height - 6)
    .text("índice de dispersão");

// Add a y-axis label.
svg.append("text")
    .attr("class", "axis")
    .attr("text-anchor", "end")
    .attr("y", 6)
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

// Load the data.
d3.json(url, function(nations) {
    periodo = acha_periodo(nations)
    partidos = acha_partidos(nations)
    partidos_selecionados = partidos
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
            div.html("<b>"+d.name + "</b></br>Governismo: " + d.governismo + "%</br>Dispersão: " + Math.round(parseFloat(transScale(d.variancia))*10)/10)
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

// Start a transition that interpolates the data based on year.
    svg.transition()
        .duration(5000).ease("linear")
        .tween("year", tweenYear)
        .each("end", enableInteraction	);

// Positions the dots based on data.
    function position(dot) {
        dot 
            .transition().duration(120)
            .attr("cx", function(d) { return xScale(transScale( x(d) )) ; } )
            .attr("cy", function(d) { return yScale(y(d)); })
            .attr("r", function(d) { raio_grupo = correcao_grupos(); return Math.abs(radiusScale(radius(d)/raioScale(raio_grupo))); })
    	    .attr("fill-opacity", function(d) {
                raio_grupo = correcao_grupos();
                var l = transScale(x(d));
                var opacidade = Math.pow((1-l/10),4);
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
            return {
                name: d.name,
                governismo: interpolateValues(d.governismo, year),
                variancia: interpolateValues(d.variancia, year),
                num_deputados: interpolateValues(d.num_deputados, year)
            };
        });
        return(a)
    }

// Finds (and possibly interpolates) the value for the specified year.
    function interpolateValues(values, year) {
        var i = bisect.left(values, year, 0, values.length - 1),
            a = values[i];
        return a[1];
    }

    function acha_periodo(dados) {
        var saida = []
        dados[0].governismo.forEach(function (d) {
            saida.push(d[0])
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
});

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
